
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
  , ResumeRemark = require('../models/remark')
  , Tag = require('../models/tag')
  , userauth = require('./user');

//简历状态：0未读；1已读 2接受 3拒绝
var RESUME_STATUS = {
    0: '未读',
    1: '已读',
    2: '接受',
    3: '拒绝'
};

module.exports = function(app) {
    /**
     * 获取当前用户有权限查看的简历列表
     *  1. 职位的创建者
     *  2. 职位所属标签的管理者
     */
    app.get('/resumes', userauth.require_author, function(req, res, next){
        var status = req.query.status || '0'; // 默认未读
        var pagging = util.get_pagging(req, 50)
          , job_id = req.query.job;
        var locals = {
            title: '简历列表', 
            jobid: job_id,
            current_job: null,
            filter_status: status,
            page_count: pagging.count,
            prev_offset: pagging.prev_offset,
            tagid: req.query.tag
        };
        var ep = new EventProxy();
        ep.assign('resumes', 'jobs', 'users', 'remarks', function(resumes_args, jobs_args, users_args, remarks_args) {
            var jobs = jobs_args[0]
              , users = users_args[0]
              , remarks = remarks_args[0]
              , resumes = resumes_args[0];
            var resume_map = {};
            resumes.forEach(function(row){
                row.user = users[row.user_id];
                row.job = jobs[row.job_id];
                row.status_name = RESUME_STATUS[row.status];
                row.filename = path.basename(row.filepath);
                row.remarks = [];
                if(row.remark) {
                    row.remarks.push({remark: row.remark, screen_name: '未知'});
                }
                resume_map[row.id] = row;
            });
            for(var i = 0, l = remarks.length; i < l; i++) {
                var remark = remarks[i];
                remark.screen_name = users[remark.user_id].screen_name;
                var resume = resume_map[remark.resume_id];
                resume.remarks.push(remark);
            }
            if(job_id) {
                locals.current_job = jobs[job_id];
            }
            locals.resumes = resumes;
            res.render('resumelist.html', locals);
        });
        ep.on('error', function(err) {
            ep.unbind();
            next(err);
        });
        ep.on('jobids', function(jobids) {
            Resume.list(status, jobids, pagging, function(err, rows){
                if(err) {
                    return ep.emit('error', err);
                }
                if(rows.length === pagging.count) {
                    locals.next_offset = pagging.next_offset;
                }
                if(rows.length === 0) {
                    ep.unbind();
                    locals.resumes = [];
                    return res.render('resumelist.html', locals);
                }
                ep.emit('resumes', rows);
            });
        });
        
        if(req.query.tag) {
            Tag.get_jobs(req.query.tag, {}, function(err, jobs) {
                var jobids = [];
                for(var i = 0, l = jobs.length; i < l; i++) {
                    jobids.push(jobs[i].id);
                }
                ep.emit('jobids', jobids);
            });
        } else {
            if(job_id) {
                ep.emit('jobids', job_id);
            } else {
                User.get_jobs(req.session.user.user_id, function(err, jobs) {
                    var jobids = [];
                    for(var i = 0, l = jobs.length; i < l; i++) {
                        jobids.push(jobs[i].id);
                    }
                    ep.emit('jobids', jobids);
                });
            }
        }
        
        ep.on('resumes', function(resumes) {
            var user_ids = [], job_ids = [], resume_ids = [];
            for(var i = 0, l = resumes.length; i < l; i++) {
                var row = resumes[i];
                user_ids.push(row.user_id);
                job_ids.push(row.job_id);
                resume_ids.push(row.id);
            }
            ResumeRemark.get_by_resume_ids(resume_ids, function(err, remarks) {
                if(err) {
                    return ep.emit('error', err);
                }
                for(var i = 0, l = remarks.length; i < l; i++) {
                    var remark = remarks[i];
                    user_ids.push(remark.user_id);
                }
                User.gets(user_ids, function(err, users){
                    if(err) {
                        return ep.emit('error', err);
                    }
                    ep.emit('users', users);
                });
                ep.emit('remarks', remarks);
            });
            Job.gets(job_ids, function(err, jobs){
                if(err) {
                    return ep.emit('error', err);
                }
                var job_map = {};
                jobs.forEach(function(job){
                    job_map[job.id] = job;
                });
                ep.emit('jobs', job_map);
            });
        });
    });
    

    // 查看当前用户投递的简历
    app.get('/resume/list/:user_id', function(req, res, next){
        var user_id = req.params.user_id
          , current_user = req.session.user;
        if(!current_user || (current_user.user_id != user_id && !current_user.is_author)) {
            return res.redirect('/');
        }
        User.get(user_id, function(err, resume_user) {
            if(err) {
                return next(err);
            }
            var locals =  {
                title: resume_user.screen_name + ' 的简历', 
                resume_user: resume_user,
                resumes: []
            };
            Resume.gets(user_id, function(err, rows){
                if(err) {
                    return next(err);
                }
                var tpl = 'job/my_resume.html';
                if(rows.length == 0) {
                    return res.render(tpl, locals);
                }
                var job_ids = [], answer_ids = [];
                rows.forEach(function(row){
                    job_ids.push(row.job_id);
                    if(row.answer_id) {
                        answer_ids.push(row.answer_id);
                    }
                });
                Job.gets(job_ids, function(err, jobs){
                    if(err) {
                        return next(err);
                    }
                    if(jobs) {
                        var job_map = {};
                        jobs.forEach(function(job){
                            job_map[job.id] = job;
                        });
                        // 填充数据
                        rows.forEach(function(row){
                            row.user = resume_user;
                            row.job = job_map[row.job_id];
                            row.status_name = RESUME_STATUS[row.status];
                            row.filename = path.basename(row.filepath);
                        });
                    }
                    locals.resumes = rows;
                    res.render(tpl, locals);
                });
            });
        });
    });
    
    app.post('/resume/upload/:job_id', function(req, res, next){
        if(!req.session.user && !req.session.user.user_id) {
            return res.send('用户未登录.');
        }
        var fields = req.form.fields, files = req.form.files;
        var filepath = files.resume ? files.resume.filename : null;
        // 判断是否合法的文件类型
        if(filepath && !util.is_filetype(filepath, constant.RESUME_FILETYPES)) {
            // 由于客户端已做判断，所以这样的情况都是恶意上传的，直接提示
            return res.send('文件格式错误: ' + filepath 
                + ' , 请上传' + constant.RESUME_FILETYPES + '格式的文件');
        }
        var job_id = req.params.job_id
          , user_id = req.session.user.user_id
          , introducer = fields.introducer;
        if(introducer && introducer.indexOf('@') == 0) {
            introducer = introducer.substring(1);
        }
        var params = {
            job_id: job_id,
            user_id: user_id,
            introducer: introducer,
            comment: fields.comment
        };
        var ep = new EventProxy();
        ep.assign('save_resume', 'save_file', function(resume_args, file_args) {
            var err = resume_args[0] || file_args[0];
            if(err) {
                return next(err);
            }
            res.redirect('/resume/list/' + user_id);
        });
        if(filepath) {
            filepath = path.join('resume/' + job_id + '/' + user_id, filepath);
            params.filepath = filepath;
            params.size = files.resume.size;
            // jobid/userid/filename
            var save_path = path.join(config.filedir, filepath);
            util.mkdirs(path.dirname(save_path), '777', function(err) {
                if(err) {
                    return ep.emit('save_file', err);
                }
                fs.rename(files.resume.path, save_path, function(err) {
                    ep.emit('save_file', err);
                });
            });
        } else {
            ep.emit('save_file');
        }
        Resume.insert(params, function(err, result){
            // job_id, user_id唯一，一个人对一个职位只能投递一份简历
            ep.emit('save_resume', err, result);
        });
    });
    
    app.post('/resumes/update/:id', userauth.require_author, function(req, res, next){
        var data = {};
        if(req.body.status) {
            data.status = req.body.status;
        }
        if(req.body.remark) {
            data.remark = req.body.remark;
        }
        Resume.update(req.params.id, data, function(err, result){
            if(err){
                console.error(err);
                return res.send('2');
            }
            res.send('1');
        });
    });
    
    app.post('/resume/:id/add_remark', userauth.require_author, function(req, res, next) {
        var resume_id = req.params.id
          , remark = req.body.remark
          , user_id = req.session.user.user_id;
        ResumeRemark.insert({resume_id: resume_id, remark: remark, user_id: user_id}, function(err, result) {
            if(err) {
                return next(err);
            }
            ResumeRemark.gets(resume_id, function(err, remarks) {
                if(err) {
                    return next(err);
                }
                var user_ids = [];
                for(var i = 0, l = remarks.length; i < l; i++) {
                    user_ids.push(remarks[i].user_id);
                }
                User.gets(user_ids, function(err, users){
                    if(err) {
                        return next(err);
                    }
                    for(var i = 0, l = remarks.length; i < l; i++) {
                        var remark = remarks[i];
                        remark.screen_name = users[remark.user_id].screen_name;
                    }
                    res.json(remarks);
                });
            });
        });
    });
};