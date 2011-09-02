
var db = require('./db.js').mysql_db
  , User = require('./user')
  , config = require('../config.js')
  , tapi = config.tapi
  , path = require('path');

var Job = module.exports = function Job(){
    
};

Job.insert = function(job, callback) {
    db.insert_or_update('job', job, callback);
};

Job.update = function(id, props, callback) {
    props.id = id;
    db.update('job', 'id', props, callback);
};

// 获取job详细信息，包含问题等
Job.get = function(id, callback) {
     if(!id) {
         return callback();
     }
     db.get_obj('job', {id: id}, function(err, job){
         if(job) {
             if(job.weibo_info) {
                 job.weibo_info = JSON.parse(job.weibo_info);
             } else {
                 job.weibo_info = {};
             }
             // 获取用户
             User.get(job.author_id, function(err, author) {
                 job.author = author;
                 callback(err, job);
             });
         } else {
             callback(err, job);
         }
     });
};

Job.query = function query(condition, params, callback) {
    if(!params) {
        params = [];
    }
    db.query('select * from job ' + condition, params, function(err, result) {
        if(result && result.length > 0) {
            var user_ids = [];
            for(var i=0; i<result.length; i++) {
                user_ids.push(result[i].author_id);
                if(result[i].weibo_info) {
                    result[i].weibo_info = JSON.parse(result[i].weibo_info);
                } else {
                    result[i].weibo_info = {};
                }
            }
            User.get_users(user_ids, function(err, users) {
                if(users) {
                    for(var i = 0, len = result.length; i < len; i++) {
                        result[i].author = users[result[i].author_id];
                    }
                }
                callback(err, result);
            });
        } else {
            callback(err, result);
        }
    });
};

Job.gets = Job.get_jobs = function(ids, callback){
    if(!ids || ids.length == 0) {
        return callback();
    }
    var qs = (new Array(ids.length)).join('?,') + '?';
    this.query('where id in (' + qs + ') order by id desc', ids, callback);
};

// 检测用户是否喜欢这些job
Job.check_likes = function(user_id, job_ids, callback) {
    var likes = {};
    if(!user_id || !job_ids || 0 == job_ids.length) {
        callback(null, likes);
    } else {
        var qs = (new Array(job_ids.length)).join('?,') + '?';
        db.query('select job_id from job_like where job_id in (' + qs + ') and user_id=?',
                job_ids.concat(user_id), function(err, rows){
            if(rows) {
                rows.forEach(function(row){
                    likes[row.job_id] = true;
                });
            }
            callback(err, likes);
        });
    }
};

Job.get_hots = function(callback) {
    db.query('select id, title, `desc` from job where status=0 order by like_count desc, resume_count desc, repost_count desc limit 10;', 
        callback);
};

Job.get_job_repost_screen_names = function(job_weibo_id, callback) {
    db.query('select distinct(screen_name) from job_repost where source_id=? limit 100', 
            [job_weibo_id], function(err, rows){
        var names = null;
        if(rows) {
            names = [];
            rows.forEach(function(row) {
                names.push(row.screen_name);
            });
        }
        callback(err, names);
    });
};

/**
 * 猜测当前用户的推荐人
 * 从转发人中判断是否有当前用户关注的人，有则取最早转发的那个
 * 若没有，从用户最近friends_timeline中判断所有的人是否在转发人列表中，有则取最早转发人
 * 若都没有，则未空
 *
 * @param job_weibo_id
 * @param user_id
 * @param callback
 * @api private
 */
Job.guess_job_introducer = function(job_weibo_id, user_id, callback){
    var introducer = null;
    if(!user_id) {
        return callback();
    }
    var sql = 'SELECT friend_screen_name FROM user_friends where user_id =? ' 
        + ' and friend_id in (select user_id from job_repost where source_id=?) limit 1';
    db.query(sql, [user_id, job_weibo_id], function(err, rows) {
        if(rows && rows.length > 0) {
            introducer = rows[0].friend_screen_name;
        }
        callback(err, introducer);
    });
};

Job.like = function(job_id, user_id, callback) {
    var sql = 'insert IGNORE into job_like set job_id=?, user_id=?;'
        + 'update job set like_count=like_count+1 where id=?;';
    db.query(sql, [job_id, user_id, job_id], callback);
};

Job.unlike = function(job_id, user_id, callback) {
    var sql = 'delete from job_like where job_id=? and user_id=?;'
        + 'update job set like_count=like_count-1 where id=?;';
    db.query(sql, [job_id, user_id, job_id], callback);
};

Job.get_likes = function(user_id, callback) {
    var sql = 'select job_id from job_like where user_id=?';
    db.query(sql, [user_id], callback);
};


//格式化微博正文
Job.format_weibo_status = function(params, job_id) {
 var redirect_url = '/job/' + job_id;
 // 使用当前登录用户发一条微博
 var status = '招聘#' + params.title + '#: ' + params.desc;
 status += ' ' + config.base_url + redirect_url;
 var data = {status: status};
 if(params.send_image) {
     // {keyname: 'pic', file: filepath}
     data.pic = path.join(config.filedir, 'upload', params.send_image);
 }
 return data;
};
