// tjob web
var express = require('express'),
	tapi = require('node-weibo'),
	redis = require('redis');
var redis_db = redis.createClient();
var app = express.createServer();
var base_url = 'http://localhost:3000';

app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());

// use jqtpl in express
app.set("view engine", "html");
app.register(".html", require("jqtpl"));


function _format_cookie_token_name(blogtype) {
	return blogtype + '_token';
};

function load_user(req, res, next) {
	req.users = {};
	var keys = [];
	['tsina', 'twitter'].forEach(function(blogtype, i){
		var name = _format_cookie_token_name(blogtype);
		var key = req.cookies[name];
		if(key) {
			keys.push([key, blogtype]);
		}
	});
	if(keys.length > 0) {
		var done = 0;
		keys.forEach(function(item) {
			redis_db.get(item[0], function(err, data) {
				if(data){
					req.users[item[1]] = JSON.parse(data);
				}
				done += 1;
				if(done == keys.length) {
					next();
				}
			});
		});
	} else {
		next();
	}
};


app.get('/', load_user, function(req, res){
	res.render('index.html', {layout: false, title: '工作达人', users: req.users});
});

app.get('/login/:blogtype', function(req, res) {
	var blogtype = req.params.blogtype;
	var user = {blogtype: blogtype};
	var auth_callback = base_url + '/callback/' + blogtype;
	// req.header('Referer')
	tapi.get_authorization_url(user, auth_callback, function(auth_url, auth_user) {
		// 5分钟超时
		redis_db.setex(auth_user.oauth_token_key, 500, auth_user.oauth_token_secret, function(err, reply){
			if(reply == 'OK') {
				res.redirect(auth_url);
			} else {
				res.redirect('/');
			}
		});
	});
});

// http://localhost:3000/callback/tsina?oauth_token=abb89bbf577a98fe8a3334f32f34dfa5&oauth_verifier=653225
app.get('/callback/:blogtype', function(req, res){
	var blogtype = req.params.blogtype;
	var oauth_token = req.query.oauth_token;
	var oauth_verifier = req.query.oauth_verifier;
	var user = {
		blogtype: blogtype,
		oauth_token_key: oauth_token,
		oauth_verifier: oauth_verifier
	};
	redis_db.get(oauth_token, function(err, secret) {
		user.oauth_token_secret = secret;
		tapi.get_access_token(user, function(auth_user) {
			if(auth_user) {
				// 获取用户信息并存储
				tapi.verify_credentials(auth_user, function(t_user) {
					Object.extend(t_user, auth_user);
					var user_key = 'user:' + blogtype + ':' + t_user.id;
					redis_db.set(user_key, JSON.stringify(t_user), function(err, reply) {
						if(reply == 'OK') {
							// 设置cookie
							var name = _format_cookie_token_name(blogtype);
							res.cookie(name, user_key, {path: '/'});
							// TODO: 应该返回登录前的页面
							res.redirect('/');
						} else {
							res.redirect('/');
						}
					});
				});
			} else {
				// 认证失败
				res.redirect('/');
			}
		});
	});
});

app.get('/logout/:blogtype', function(req, res) {
//	var referer = req.header('Referer');
	var blogtype = req.params.blogtype;
	var name = _format_cookie_token_name(blogtype);
	res.clearCookie(name);
	res.redirect('/');
});

app.listen(3000);