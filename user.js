// 处理用户认证相关逻辑
var tapi = require('node-weibo'),
	config = require('./config.js');

function _format_cookie_token_name(blogtype) {
	return blogtype + '_token';
};

// 获取用户信息
function load_user_middleware(app) {
	return function(req, res, next) {
		req.users = {};
		res.local('users', req.users);
		var users = {};
		['tsina', 'twitter'].forEach(function(blogtype, i){
			var name = _format_cookie_token_name(blogtype);
			var user_id = req.cookies[name];
			if(user_id) {
				users[user_id] = blogtype;
			}
		});
		if(Object.keys(users).length > 0) {
			get_users(app, Object.keys(users), function(rows) {
				for(var user_id in rows) {
					var row = rows[user_id];
					row.is_author = row.user_role.indexOf('author') >= 0;
					row.is_admin = row.user_role.indexOf('admin') >= 0 || row.screen_name == '淘job';
					req.users[row.blogtype] = row;
					delete users[user_id];
				}
				// 删除剩余的，无法找到用户cookie数据
				for(var k in users) {
					// 找不到，则删除cookie
					res.clearCookie(_format_cookie_token_name(users[k]));
				}
				next();
			});
		} else {
			next();
		}
	};
};

// 必须具有author角色
function require_author(req, res, next) {
	if(req.users && req.users.tsina && req.users.tsina.is_author) {
		next();
	} else {
		res.redirect('/');
	}
};

//必须具有admin角色
function require_admin(req, res, next) {
	if(req.users && req.users.tsina && req.users.tsina.is_admin) {
		next();
	} else {
		res.redirect('/');
	}
};

function get_users(app, user_ids, callback) {
	if(!user_ids || user_ids.length == 0) {
		callback([]);
		return;
	}
	var paddings = [];
	for(var i=0; i<user_ids.length; i++) {
		paddings.push('?');
	}
	app.mysql_db.query('select * from `user` where user_id in (' + paddings.join(',') + ')', user_ids, function(err, rows) {
		var users = {};
		for(var i=0; i<rows.length; i++) {
			var row = rows[i];
			var user = JSON.parse(row.info);
			user.user_role = row.role || '';
			users[user.user_id] = user;
		}
		callback(users);
	});
};

function auth(app) {
	app.get('/login/:blogtype', function(req, res) {
		var blogtype = req.params.blogtype;
		var user = {blogtype: blogtype};
		var auth_callback = app.base_url + '/callback/' + blogtype;
		var referer = req.header('Referer') || '/';
		// 防止死跳转
		if(referer.indexOf('/login/') >= 0) {
			referer = '/';
		}
		tapi.get_authorization_url(user, auth_callback, function(auth_url, auth_user, text_status, error_code) {
			if(auth_url) {
				var auth_info = JSON.stringify([auth_user.oauth_token_secret, referer]);
				res.cookie('authinfo', auth_info, {path: '/'});
				res.redirect(auth_url);
			} else {
				res.send('新浪登录异常，请重试. <a href="/login/' + blogtype + '">新浪登录</a>');
			}
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
		var auth_info = JSON.parse(req.cookies.authinfo);
		var referer = auth_info[1];
		user.oauth_token_secret = auth_info[0];
		tapi.get_access_token(user, function(auth_user) {
			res.cookie('authinfo', '', {path: '/'});
			if(auth_user) {
				// 获取用户信息并存储
				tapi.verify_credentials(auth_user, function(t_user) {
					Object.extend(t_user, auth_user);
					var user_id = blogtype + ':' + t_user.id;
					t_user.user_id = user_id;
					app.mysql_db.query('INSERT INTO user(user_id, blogtype, `info`, `role`, created_at) VALUES (?, ?, ?, "user", now()) ' 
							+ ' ON DUPLICATE KEY UPDATE `info`=VALUES(`info`);',
							[user_id, blogtype, JSON.stringify(t_user)], 
						function(err, result) {
							var name = _format_cookie_token_name(blogtype);
							// 保存30天
							res.cookie(name, user_id, {path: '/', maxAge: 138000000});
							// TODO: 应该返回登录前的页面
							res.redirect(referer);
						}
					);
				});
			} else {
				// 认证失败
				res.redirect(referer);
			}
		});
	});

	app.get('/logout/:blogtype', function(req, res) {
		var referer = req.header('Referer') || '/';
		var blogtype = req.params.blogtype;
		var name = _format_cookie_token_name(blogtype);
		res.cookie(name, '', {path: '/'});
		res.redirect(referer);
//		var key = req.cookies[name];
//		if(key) {
//			redis_db.del(key, function(){
//				// 302跳转无法删除cookie？
////				res.clearCookie(name);
//				res.cookie(name, '', {path: '/'});
//				res.redirect(referer);
//			});
//		} else {
//			res.clearCookie(name);
//			res.redirect(referer);
//		}
	});
	
	app.get('/users', load_user_middleware(app), require_admin, function(req, res, next){
		app.mysql_db.query('select * from user order by id desc', function(err, rows){
			if(err) {
				next(err);
			} else {
				for(var i=0; i<rows.length; i++) {
					var user = rows[i];
					var t_user = JSON.parse(user.info);
					delete t_user.id;
					delete t_user.created_at;
					Object.extend(user, t_user);
				}
				res.render('users.html', {
					userlist: rows 
				});
			}
		});
	});
	
	app.post('/user/:id', load_user_middleware(app), require_admin, function(req, res, next){
		var role = req.body.role || 'user';
		app.mysql_db.query('update user set role=? where id=?', [role, req.params.id], function(err, rows){
			if(err) {
				next(err);
			} else {
				res.send('1');
			}
		});
	});
};

module.exports.auth = auth;
module.exports.load_user_middleware = load_user_middleware;
module.exports.get_users = get_users;
module.exports.require_author = require_author;
module.exports.require_admin = require_admin;