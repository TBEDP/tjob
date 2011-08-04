
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
  , userauth = require('./user');

//简历状态：0未读；1已读 2接受 3拒绝
var RESUME_STATUS = {
    0: '未读',
    1: '已读',
    2: '接受',
    3: '拒绝'
};

module.exports = function(app) {
    app.get('/resumes', userauth.require_author, function(req, res, next){
        var status = req.query.status || '0'; // 默认未读
        var pagging = util.get_pagging(req, 50)
          , job_id = req.query.job_id;
        Resume.list(status, req.query.job, pagging, function(err, rows){
            if(err) {
                return next(err);
            }
            var locals = {
                title: '简历列表', 
                jobid: job_id,
                current_job: null,
                resumes: rows,
                filter_status: status,
                page_count: pagging.count,
                prev_offset: pagging.prev_offset
            };
            if(rows.length == pagging.count) {
                locals.next_offset = pagging.next_offset;
            }
            if(rows.length == 0) {
                res.render('resumelist.html', locals);
                return;
            }
            var user_ids = [], job_ids = [];
            rows.forEach(function(row){
                user_ids.push(row.user_id);
                job_ids.push(row.job_id);
            });
            User.gets(user_ids, function(err, users){
                if(err) {
                    return next(err);
                }
                Job.gets(job_ids, function(err, jobs){
                    if(err) {
                        return next(err);
                    }
                    var job_map = {};
                    jobs.forEach(function(job){
                        job_map[job.id] = job;
                    });
                    // 填充数据
                    rows.forEach(function(row){
                        row.user = users[row.user_id];
                        row.job = job_map[row.job_id];
                        row.status_name = RESUME_STATUS[row.status];
                        row.filename = path.basename(row.filepath);
                    });
                    if(job_id && jobs.length > 0) {
                        locals.current_job = jobs[0];
                    }
                    res.render('resumelist.html', locals);
                });
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
                title: '我的简历', 
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
        var status = req.body.status;
        Resume.update(req.params.id, {status: status}, function(err, result){
            if(err){
                console.error(err);
                return res.send('2');
            }
            res.send('1');
        });
    });
};