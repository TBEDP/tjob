
var User = require('../models/user')
  , config = require('../config')
  , tapi = config.tapi
  , util = require('../public/js/util');

//必须具有author角色
var require_author = function(req, res, next) {
    var user = req.session.user;
    if(user && user.is_author) {
        next();
    } else {
        res.redirect('/');
    }
};

// 必须具有admin角色
var require_admin = function(req, res, next) {
    var user = req.session.user;
    if(user && user.is_admin) {
        next();
    } else {
        res.redirect('/');
    }
};

module.exports = function(app){
    
    // auto load current_user role
    app.use(function(req, res, next) {
        var current_user = req.session.user;
        if(!current_user || !current_user.user_id) {
            res.local('current_user', null);
            return next();
        }
        User.get(current_user.user_id, function(err, user) {
            if(user) {
                if(user.role) {
                    current_user.is_author = user.role.indexOf('author') >= 0;
                    current_user.is_admin = user.role.indexOf('admin') >= 0;
                }
                if(!user.is_admin) {
                    current_user.is_admin = user.screen_name == config.tjob_user.screen_name;
                }
                req.session.user = current_user;
            }
            res.local('current_user', req.session.user);
            next();
        }); 
    });
    
    app.get('/login/:blogtype', function(req, res) {
        var blogtype = req.params.blogtype;
        var user = {blogtype: blogtype};
        var auth_callback = config.base_url + '/callback/' + blogtype;
        var referer = req.header('Referer') || '/';
        // 防止死跳转
        if(referer.indexOf('/login/') >= 0) {
            referer = '/';
        }
        tapi.get_authorization_url(user, auth_callback, function(err, auth_url) {
            if(auth_url) {
                req.session.authinfo = [user.oauth_token_secret, referer];
                res.redirect(auth_url);
            } else {
                res.send('新浪登录异常: ' + err.message +' ，请重试. <a href="/login/' + blogtype + '">新浪登录</a>');
            }
        });
    });

    // http://localhost:3000/callback/tsina?oauth_token=abb89bbf577a98fe8a3334f32f34dfa5&oauth_verifier=653225
    app.get('/callback/:blogtype', function(req, res, next){
        var blogtype = req.params.blogtype;
        var oauth_token = req.query.oauth_token;
        var oauth_verifier = req.query.oauth_verifier;
        var user = {
            blogtype: blogtype,
            oauth_token_key: oauth_token,
            oauth_verifier: oauth_verifier
        };
        var auth_info = req.session.authinfo;
        var referer = auth_info[1] || '/';
        user.oauth_token_secret = auth_info[0];
        tapi.get_access_token(user, function(error, auth_user) {
            if(error) {
                return res.send('get_access_token 异常: ' + error.message +' ，请重试. <a href="/login/' + blogtype + '">新浪登录</a>');
            }
            if(auth_user) {
                // 获取用户信息并存储
                tapi.verify_credentials(auth_user, function(error, t_user) {
                    if(error) {
                        return res.send('verify_credentials 异常: ' + error.message +' ，请重试. <a href="/login/' + blogtype + '">新浪登录</a>');
                    }
                    Object.extend(t_user, auth_user);
                    var user_id = blogtype + ':' + t_user.id;
                    t_user.user_id = user_id;
                    User.insert(t_user, function(err, result) {
                        if(err) {
                            return next(err);
                        }
                        // affectedRows == 1 代表是insert，第一次获取将爬取用户好友信息
                        if(result.affectedRows == 1) {
                            User.fetch_user_friends(t_user, function(err, friends_data){
//                                  console.log('fetch friends', friends_data.users.length);
                            });
                        }
                        req.session.user = t_user;
                        res.redirect(referer);
                    });
                });
            } else {
                // 认证失败
                res.redirect(referer);
            }
        });
    });

    app.get('/logout/:blogtype', function(req, res) {
        var referer = req.header('Referer') || '/';
        req.session.user = null;
        res.redirect(referer);
    });
    
    app.get('/users', require_admin, function(req, res, next){
        var pagging = util.get_pagging(req, 20);
        User.list(pagging.offset, pagging.count, function(err, rows){
            if(err) {
                return next(err);
            }
            var locals = {
                userlist: rows,
                page_count: pagging.count,
                prev_offset: pagging.prev_offset
            };
            if(rows.length === pagging.count) {
                locals.next_offset = pagging.next_offset;
            }
            res.render('users.html', locals);
        });
    });
    
    app.get('/users/search', require_admin, function(req, res, next){
        var query = req.query.username || '';
        if(!query) {
            return res.redirect('/users');
        }
        User.search(query, function(err, rows){
            if(err) {
                return next(err);
            }
            var locals = {
                userlist: rows || [],
                username: query
            };
            res.render('users.html', locals);
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
        User.search_friends(req.session.user.user_id, query, limit, function(err, rows){
            var names = [];
            if(err) {
                console.error(err);
            }
            if(rows) {
                rows.forEach(function(row){
                    names.push(row.friend_screen_name);
                });
            }
            res.send(names.join('\n'));
        });
    });
    
    app.post('/user/:id', require_admin, function(req, res, next){
        var role = req.body.role || 'user';
        User.update(req.params.id, {role: role}, function(err, rows){
            if(err) {
                console.error(err);
                return res.send('2');
            }
            res.send('1');
        });
    });
};

exports.require_author = require_author;
exports.require_admin = require_admin;