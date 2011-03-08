// tjob web
var express = require('express'),
	tapi = require('node-weibo'),
	redis = require('redis');
var redis_db = redis.createClient();
var app = express.createServer();
var base_url = 'http://localhost:3000';

app.use(express.static(__dirname + '/public'));

// use jqtpl in express
app.set("view engine", "html");
app.register(".html", require("jqtpl"));

app.get('/', function(req, res){
	res.render('index.html', {layout: false, title: '工作达人'});
});

app.get('/login/:blogtype', function(req, res) {
	var blogtype = req.params.blogtype;
	var user = {blogtype: blogtype};
	var auth_callback = base_url + '/callback/' + blogtype;
	// req.header('Referer')
	tapi.get_authorization_url(user, auth_callback, function(auth_url, auth_user) {
		console.log(auth_user);
		// 5分钟超时
		redis_db.setex(auth_user.oauth_token_key, 500, auth_user.oauth_token_secret, function(err, reply){
			console.log(reply);
			res.redirect(auth_url);
		});
	});
//	res.send('blogtype ' + req.params.blogtype);
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
			redis_db.set(auth_user.oauth_token_key, JSON.stringify(auth_user), function() {
				// 设置cookie
				res.cookie('token', blogtype + ':' + auth_user.oauth_token_key);
				// TODO: 应该返回登录前的页面
				res.redirect('/');
			});
		});
	});
});

app.listen(3000);