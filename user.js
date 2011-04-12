// 处理用户认证相关逻辑
var config = require('./config.js'),
	tapi = config.tapi,
	utillib = require('./public/js/util.js'),
	mysql_db = require('./db.js').mysql_db;

function _format_cookie_token_name(blogtype) {
	return blogtype + '_token';
};

// 获取用户信息
function load_user_middleware(req, res, next) {
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
		get_users(Object.keys(users), function(rows) {
			for(var user_id in rows) {
				var row = rows[user_id];
				row.is_author = row.user_role.indexOf('author') >= 0;
				row.is_admin = row.user_role.indexOf('admin') >= 0 
					|| row.screen_name == config.tjob_user.screen_name;
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

function get_users(user_ids, callback) {
	if(!user_ids || user_ids.length == 0) {
		callback([]);
		return;
	}
	var paddings = [];
	for(var i=0; i<user_ids.length; i++) {
		paddings.push('?');
	}
	mysql_db.query('select * from `user` where user_id in (' 
			+ paddings.join(',') + ')', user_ids, function(err, rows) {
		var users = {};
		if(err) {
			console.error(err);
		} else {
			for(var i=0; i<rows.length; i++) {
				var row = rows[i];
				var user = JSON.parse(row.info);
				user.user_role = row.role || '';
				users[user.user_id] = user;
			}
		}
		callback(users);
	});
};

/**
 * 根据用户id获取用户信息，成功则调用callback(user)，否则callback(null)
 *
 * @param {String}user_id, 格式为`blogtype:user_id`, tsina:123123
 * @param {Function}callback
 * @api public
 */
var get_user = module.exports.get_user = function(user_id, callback) {
	if(!user_id) {
		callback(null);
	} else {
		mysql_db.get_obj('user', {user_id: user_id}, callback);
	}
};

/**
 * 获取用户所跟随的人
 *
 * @param user_id
 * @param callback
 * @api public
 */
var get_user_friends = module.exports.get_user_friends = function(user_id, callback) {
	if(!user_id) {
		callback(null);
	} else {
		mysql_db.query('select friend_id from user_friends where user_id=?', 
				[user_id], function(err, rows){
			var user_ids = [];
			if(err) {
				console.err(err);
			} else {
				for(var i=0; i<rows.length; i++) {
					user_ids.push(rows[i].friend_id);
				}
			}
			get_users(user_ids, callback);
		});
	}
};

/**
 * 从微博中获取用户所跟随的人，并保存到数据库中
 *
 * @param {Object}user
 * @param {Number}count, 默认200个
 * @param {Number}cursor, 默认第一页。用于分页请求，请求第1页cursor传-1，
 * 在返回的结果中会得到next_cursor字段，表示下一页的cursor。
 * next_cursor为0表示已经到记录末尾。
 * @param {Function}callback
 * @api public
 */
var fetch_user_friends = 
		module.exports.fetch_user_friends = function(user, count, cursor, callback){
	if(arguments.length == 2) {
		// 如果使用默认参数，则第二个参数就是callback
		callback = count;
		count = null;
	} else if(arguments.length == 3) {
		callback = cursor;
		cursor = null;
	}
	cursor = cursor == null ? -1 : cursor;
	count = count == null ? 200 : count;
	var params = {user: user, count: count, cursor: cursor};
	tapi.friends(params, function(data, err, res){
		if(err) {
			console.error(err);
			callback(data);
		} else {
			// TODO 保存到数据库
			// data = {users: {}, next_cursor: x}
			var friends = data && data.users || [];
			if(friends.length > 0) {
				var params = [], qs = [];
				var sql = 'INSERT INTO user_friends(user_id, friend_id, friend_screen_name, friend_user) values';
				for(var i=0;i<friends.length;i++) {
					var friend = friends[i];
					qs.push('(?, ?, ?, ?)');
					params.push(user.user_id, 
						user.blogtype + ':' + friend.id,
						friend.screen_name,
						JSON.stringify(friend)
					);
				}
				sql += qs.join(',') + ' on duplicate key update friend_screen_name=values(friend_screen_name);'
					+ ' update user set fetch_friends_cursor=? where user_id=?';
				var next_cursor = data.next_cursor || 0;
				params.push(next_cursor, user.user_id);
				mysql_db.query(sql, params, function(err, result){
					if(err) {
						console.error(err);
					}
					callback(data);
				});
			} else {
				callback(data);
			}
		}
	});
};

function auth(app) {
	app.get('/login/:blogtype', function(req, res) {
		var blogtype = req.params.blogtype;
		var user = {blogtype: blogtype};
		var auth_callback = config.base_url + '/callback/' + blogtype;
		var referer = req.header('Referer') || '/';
		// 防止死跳转
		if(referer.indexOf('/login/') >= 0) {
			referer = '/';
		}
		tapi.get_authorization_url(user, auth_callback, function(auth_url, text_status, error_code) {
			if(auth_url) {
				var auth_info = JSON.stringify([user.oauth_token_secret, referer]);
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
					mysql_db.query('INSERT INTO user(user_id, blogtype, `info`, screen_name, `role`, created_at) VALUES (?, ?, ?, ?, "user", now()) ' 
							+ ' ON DUPLICATE KEY UPDATE `info`=VALUES(`info`), screen_name=values(screen_name);',
							[user_id, blogtype, JSON.stringify(t_user), t_user.screen_name], 
						function(err, result) {
							// affectedRows == 1 代表是insert，第一次获取将爬取用户好友信息
							if(result.affectedRows == 1) {
								fetch_user_friends(t_user, function(friends_data){
//									console.log('fetch friends', friends_data.users.length);
								});
							}
							var name = _format_cookie_token_name(blogtype);
							// 保存30天
							res.cookie(name, user_id, 
								{path: '/', maxAge: 138000000});
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
	
	app.get('/users', load_user_middleware, require_admin, function(req, res, next){
		var pagging = utillib.get_pagging(req, 20);
		mysql_db.query('select id, screen_name, role, created_at, updated_at from user order by id desc limit ?, ?', 
				[pagging.offset, pagging.count], function(err, rows){
			if(err) {
				next(err);
			} else {
				var locals = {
					userlist: rows,
					page_count: pagging.count,
					prev_offset: pagging.prev_offset
				};
				if(rows.length == pagging.count) {
					locals.next_offset = pagging.next_offset;
				}
				res.render('users.html', locals);
			}
		});
	});
	
	app.get('/users/search', load_user_middleware, require_admin, function(req, res, next){
		var query = req.query.username || '';
		query = mysql_db.escape(query.replace(/\?/g, ''));
		query = query.substring(1, query.length - 1).trim();
		if(!query) {
			res.redirect('/users');
			return;
		}
		mysql_db.query('select id, screen_name, role, created_at, updated_at from user where screen_name like "%' + query + '%"', 
				function(err, rows){
			if(err) {
				next(err);
			} else {
				var locals = {
					userlist: rows,
					username: query
				};
				res.render('users.html', locals);
			}
		});
	});
	
	app.get('/user/friends/search', function(req, res){
		var query = req.query.q,
			limit = req.query.limit;
		try {
			limit = parseInt(limit);
			if(limit > 50 || limit < 5) {
				limit = 10;
			}
		}catch(e) {
			limit = 10;
		}
		query = mysql_db.escape(query.replace(/\?/g, ''));
		query = '%' + query.substring(1, query.length - 1).trim() + '%';
		mysql_db.query('select friend_screen_name from user_friends ' 
				+ 'where user_id = ? and friend_screen_name like "' + query + '" limit ' + limit,
				[req.cookies.tsina_token], function(err, rows){
			var names = [];
			if(err) {
				console.error(err);
			} else {
				rows.forEach(function(row){
					names.push(row.friend_screen_name);
				});
			}
			res.send(names.join('\n'));
		});
	});
	
	app.post('/user/:id', load_user_middleware, require_admin, function(req, res, next){
		var role = req.body.role || 'user';
		mysql_db.query('update user set role=? where id=?', [role, req.params.id], function(err, rows){
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
