
var db = require('./db.js').mysql_db
  , path = require('path');

var Resume = module.exports = function Resume() {
    
};

Resume.insert = function(resume, callback) {
    resume.created_at = db.literal('now()');
    var not_updates = ['created_at'];
    db.insert_or_update('job_resume', resume, not_updates, function(err, result) {
        if(result.affectedRows == 1) {
            // 增加简历统计数目
            db.query('update job set resume_count=resume_count+1 where id=?', [resume.job_id]);
        }
        callback(err, result);
    });
};

Resume.update = function(id, props, callback) {
    props.id = id;
    db.update('job_resume', 'id', props, callback);
};

Resume.get = function(job_id, user_id, callback) {
    var params = {job_id: job_id, user_id: user_id};
    db.get_obj('job_resume', params, function(err, resume) {
        if(resume) {
            resume.filename = path.basename(resume.filepath);
        }
        callback(err, resume);
    });
};

Resume.gets = function(user_id, callback) {
    var sql = 'select * from job_resume where user_id=? order by id desc';
    db.query(sql, [user_id], callback);
};

Resume.list = function(status, job_ids, pagging, callback) {
    var sql = 'select * from job_resume'
      , params = [];
    if(status !== 'all') {
        sql += ' where status=?';
        params.push(status);
    }
    if(job_ids) {
        if(!(job_ids instanceof Array)) {
            job_ids = [job_ids];
        }
        if(job_ids.length === 0) {
            if(sql.indexOf('where ') < 0) {
                sql += ' where ';
            } else {
                sql += ' and ';
            }
            sql += ' 1 != 1 ';
        } else {
            var qs = (new Array(job_ids.length)).join('?,') + '?';
            if(sql.indexOf('where ') < 0) {
                sql += ' where ';
            } else {
                sql += ' and ';
            }
            sql += ' job_id in (' + qs + ')';
            params = params.concat(job_ids);
        }
    }
    sql += ' order by id desc';
    if(pagging) {
        sql += ' limit ?, ?';
        params.push(pagging.offset, pagging.count);
    }
    db.query(sql, params, callback);
};