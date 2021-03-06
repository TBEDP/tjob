/**
 * Job handler
 */

var path = require('path');
var fs = require('fs');
var EventProxy = require('../lib/eventproxy.js').EventProxy;
var config = require('../config.js');
var tapi = config.tapi;
var util = require('../public/js/util.js');
var constant = require('../public/js/constant.js');
var User = require('../models/user');
var Job = require('../models/job');
var Tag = require('../models/tag');
var Resume = require('../models/resume');
var userauth = require('./user');
var db = require('../models/db').mysql_db;

module.exports = function(app) {
  // 热门职位
  app.get('/job/hot', function(req, res, next) {
    Job.get_hots(function(err, rows) {
      var jobs = rows || [], host = req.headers['host'];
      for (var i = 0, l = jobs.length; i < l; i++) {
        var job = jobs[i];
        job.url = 'http://' + host + '/job/' + job.id;
      }
      res.send(JSON.stringify(jobs));
    });
  });
    
    // 添加职位信息
    app.get('/job/create', userauth.require_author, 
            function(req, res, next) {
        var ep = new EventProxy();
        ep.assign('job', 'tags', 'job_tags', function(job_args, tags_args, job_tags_args) {
            var tags = tags_args[0], selected = job_tags_args[0];
            if(tags && selected) {
                for(var i = 0, len = tags.length; i < len; i++) {
                    if(selected[tags[i].id]) {
                        tags[i].checked = true;
                    }
                }
            }
            var locals = {
                job: job_args[0],
                title: job_args[1],
                tags: tags
            };
            res.render('job/create.html', locals);
        });
        var job_id = req.query.job;
        if(job_id) {
            Job.get(job_id, function(err, job){
                var user_id = req.session.user.user_id;
                if(!job || (job.author_id != user_id && !req.session.user.is_admin)) {
                    ep.removeAllListeners();
                    return res.redirect('/');
                }
                job.sync_weibo = job.repost_id !== '0';
                ep.emit('job', job, '更新职位信息');
            });
            Tag.get_job_tags(job_id, function(err, job_tags) {
                var map = null;
                if(job_tags) {
                    map = {};
                    for(var i = 0, len = job_tags.length; i < len; i++) {
                        var t = job_tags[i];
                        map[t.tag] = true;
                    }
                }
                ep.emit('job_tags', map);
            });
        } else {
            ep.emit('job', {sync_weibo: true}, '发布职位信息');
            ep.emit('job_tags');
        }
        Tag.list(function(err, tags) {
            ep.emit('tags', tags || []);
        });
    });
    
    app.post('/job/create', userauth.require_author, function(req, res, next) {
        var params = req.body;
        params.author_id = req.session.user.user_id;
        var tags = params['tags'];
        if(typeof tags === 'string') {
            tags = [tags];
        }
        delete params['tags'];
        var job = {
            title: params.title,
            desc: params.desc,
            text: params.text,
            author_id: params.author_id
        };
        if(!params.sync_weibo) {
            job.repost_id = '0'; // 设置为0，让计划认为也不转发
        } else {
            job.repost_id = null;
        }
        var job_id = params.id;
        if(job_id) {
            // 更新
            delete job.author_id; // 不修改作者
            Job.get(job_id, function(err, obj){
                if(err || !obj) {
                    return next(err);
                }
                if(obj.repost_id !== '0' && obj.repost_id !== null) {
                    // 已经转发，不能设置 repost_id
                    delete job.repost_id;
                }
                Job.update(job_id, job, function(err, r) {
                    var redirect_url = '/job/' + job_id;
                    res.send(redirect_url);
                });
            });
            Tag.add_job_tags(job_id, tags);
        } else { // 新增
            Job.insert(job, function(err, r) {
                if(err) {
                    return next(err);
                }
                if(r && r.insertId) {
                    var job_id = r.insertId;
                    var redirect_url = '/job/' + job_id;
                    if(params.sync_weibo) {
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
                        res.send(redirect_url);
                    }
                    Tag.add_job_tags(job_id, tags);
                } else {
                    res.send('no id');
                }
            });
        }
    });

    app.get('/job/:id', function(req, res, next) {
        var job_id = req.params.id;
        var tpl = 'job/detail.html', user = req.session.user;
        var ep = new EventProxy();
        ep.assign('job', 'tags', 'resume', 'likes', function(job_args, tags_args, resume_args, likes_args) {
            var locals = {title: '职位信息', resume: null, job: null};
            var job = job_args[0];
            locals.job = job;
            locals.resume = resume_args[0];
            locals.tags = tags_args[0] || [];
            var likes = likes_args[0];
            if(likes) {
                locals.job.user_like = likes[job.id];
            }
            res.render(tpl, locals);
        });
        if(user && user.user_id) {
            // 如果用户已经登录，则判断用户是否提交过简历
            Resume.get(job_id, user.user_id, function(err, resume) {
                ep.emit('resume', resume);
            });
            Job.check_likes(user.user_id, [job_id], function(err, likes) {
                ep.emit('likes', likes);
            });
        } else {
            ep.emit('resume');
            ep.emit('likes');
        }
        Tag.get_job_tags(job_id, function(err, tag_ids) {
            var ids = [];
            for(var i = 0, l = tag_ids.length; i < l; i++) {
                ids.push(tag_ids[i].tag);
            }
            Tag.gets(ids, function(err, tags) {
                ep.emit('tags', tags);
            });
        });
        Job.get(job_id, function(err, job) {
            if(err || !job) {
                ep.removeAllListeners();
                return next(err);
            }
            ep.emit('job', job);
        });
    });
    
    app.post('/job/:id', function(req, res, next) {
        var job_id = req.params.id, status = parseInt(req.body.status);
        Job.update(job_id, {status: status}, function(err) {
            if(err) {
                return next(err);
            }
            if(status === 1) {
                // 完成, delete tags
                Tag.add_job_tags(job_id, null);
            }
            res.send('1');
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
            query = db.escape(query.replace(/\?/g, ''));
            query = query.substring(1, query.length - 1); // remove '
            Job.query('where title like "%?%" or `desc` like "%?%" '.replace(/\?/g, query), [], function(err, rows){
                if(err) {
                    return next(err);
                }
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
