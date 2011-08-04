
var path = require('path')
  , fs = require('fs')
  , EventProxy = require('../lib/eventproxy.js').EventProxy
  , config = require('../config.js')
  , tapi = config.tapi
  , util = require('../public/js/util.js')
  , constant = require('../public/js/constant.js')
  , User = require('../models/user')
  , Job = require('../models/job')
  , Resume = require('../models/resume')
  , userauth = require('./user')
  , db = require('../models/db').mysql_db;


module.exports = function(app){
    // 热门职位
    app.get('/job/hot', function(req, res, next){
        Job.get_hots(function(err, rows){
            if(err) {
                return next(err);
            }
            res.send(JSON.stringify(rows));
        });
    });
    
    // 添加职位信息
    app.get('/job/create', userauth.require_author, 
            function(req, res, next) {
        if(req.query.job) {
            Job.get(req.query.job, function(err, job){
                var user_id = req.session.user.user_id;
                if(!job || job.author_id != user_id) {
                    res.redirect('/');
                } else {
                    res.render('job/create.html', {
                        title: '更新职位信息',
                        job: job
                    });
                }
            });
        } else {
            res.render('job/create.html', {
                title: '发布职位信息',
                job: {}
            });
        }
    });
    
    app.post('/job/create', userauth.require_author, function(req, res, next) {
        var params = req.body;
        params.author_id = req.session.user.user_id;
        var job = {
            title: params.title,
            desc: params.desc,
            text: params.text,
            author_id: params.author_id
        };
        if(params.id) {
            // 更新
            Job.update(params.id, job, function(err, r) {
                var redirect_url = '/job/' + params.id;
                res.send(redirect_url);
            });
        } else { // 新增
            Job.insert(job, function(err, r) {
                if(err) {
                    return next(err);
                }
                if(r && r.insertId) {
                    var job_id = r.insertId;
                    var redirect_url = '/job/' + job_id;
                    // 使用当前登录用户发一条微博
                    var update_data = Job.format_weibo_status(params, job_id);
                    update_data.user = req.session.user;
                    tapi.update(update_data, function(err, data){
                        if(err) {
                            console.error('tapi.update error:', err);
                            return next(err);
                        }
                        if(data) {
                            var props = {weibo_id: data.id, weibo_info: JSON.stringify(data)};
                            props.last_check = db.literal('now()');
                            Job.update(job_id, props, function(err, result) {
                                if(err) {
                                    console.error('save weibo_info error:', err);
                                }
                            });
                        }
                        res.send(redirect_url);
                    });
                } else {
                    res.send('no id');
                }
            });
        }
    });

    app.get('/job/:id', function(req, res, next) {
        var job_id = req.params.id;
        var locals = {title: '职位信息', resume: null, job: null};
        Job.get(job_id, function(err, job) {
            if(err || !job) {
                return next(err);
            }
            locals.job = job;
            var tpl = 'job/detail.html'
              , user = req.session.user;
            if(user && user.user_id) {
                // 如果用户已经登录，则判断用户是否提交过简历
                var ep = new EventProxy();
                ep.assign("resume", "likes", function(resume_args, likes_args) {
                    locals.resume = resume_args[0];
                    var likes = likes_args[0];
                    if(likes) {
                        locals.job.user_like = likes[job.id];
                    }
                    res.render(tpl, locals);
                });
                Resume.get(job_id, user.user_id, function(err, resume) {
                    ep.emit('resume', resume);
                });
                Job.check_likes(user.user_id, [job_id], function(err, likes) {
                    ep.emit('likes', likes);
                });
            } else {
                res.render(tpl, locals);
            }
        });
    });
    
    // 获取实时更新
    app.get('/job/:id/repost_users/:source_id', function(req, res, next){
        var data = {users: [], introducer: null}
          , current_user_id = req.cookies.tsina_token
          , weibo_id = req.params.source_id;
        var ep = new EventProxy();
        ep.assign('screen_names', 'introducer', function(screen_names_args, introducer_args) {
            data.users = screen_names_args[0];
            data.introducer = introducer_args[0];
            res.send(JSON.stringify(data));
        });
        Job.get_job_repost_screen_names(weibo_id, function(err, screen_names) {
            ep.emit('screen_names', screen_names);
        });
        Job.guess_job_introducer(weibo_id, current_user_id, function(err, introducer) {
            ep.emit('introducer', introducer);
        });
    });
    
    // 更新
    app.post('/job/:id', userauth.require_author, function(req, res, next){
        var status = req.body.status || '0';
        mysql_db.query('update job set status=? where id=? and author_id=?', 
                [status, req.params.id, req.cookies.tsina_token],
                function(err, result) {
            if(err){
                next(err);
            } else {
                res.send('1');
            }
        });
    });
    
    // 职位搜索
    app.get('/job/search', function(req, res, next){
        var query = req.query.q;
        var locals = {
            title: query + ' - 职位搜索',
            query: query,
            jobs: []
        };
        if(!query) {
            res.render('index.html', locals);
        } else {
            query = mysql_db.escape(query.replace(/\?/g, ''));
            query = query.substring(1, query.length - 1); // remove '
            get_jobs('where title like "%?%" or `desc` like "%?%" '.replace(/\?/g, query), [], function(rows){
                locals.jobs = rows;
                res.render('index.html', locals);
            });
        }
    });
    
    /* 我喜欢此职位接口
     * return: 
     *     1:未知用户, 2:异常, 0: 成功.
     */ 
    app.get('/job/like/:id', function(req, res){
        var job_id = req.params.id;
        var user = req.session.user;
        if(user) {
            Job.like(job_id, user.user_id, function(err, result){
                if(err) {
                    console.error(err);
                    return res.send('2');
                }
                res.send('0');
            });
        } else {
            res.send('1');
        }
    });
    
    app.get('/job/unlike/:id', function(req, res){
        var job_id = req.params.id;
        var user = req.session.user;
        if(user) {
            Job.unlike(job_id, user.user_id, function(err, result) {
                if(err) {
                    console.error(err);
                    return res.send('2');
                }
                res.send('0');
            });
        } else {
            res.send('1');
        }
    });
    
    app.get('/job/likes/:user_id', function(req, res, next){
        var user_id = req.params.user_id, user = req.session.user;
        if(!user || user.user_id !== user_id) {
            return res.redirect('/');
        } else {
            Job.get_likes(user_id, function(err, rows){
                if(err) {
                    return next(err);
                }
                var job_ids = [];
                rows.forEach(function(row){
                    job_ids.push(row.job_id);
                });
                Job.gets(job_ids, function(err, jobs){
                    if(jobs) {
                        jobs.forEach(function(job){
                            job.user_like = true;
                        });
                    }
                    var locals = {
                        title: '我喜欢的职位',
                        jobs: jobs
                    };
                    res.render('index.html', locals);
                });
            });
        }
    });
};