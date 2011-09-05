var db = require('./db.js').mysql_db
  , path = require('path');

var ResumeRemark = module.exports = function Resume() {
    
};

ResumeRemark.insert = function(remark, callback) {
    remark.created_at = db.literal('now()');
    var not_updates = ['created_at'];
    db.insert_or_update('job_resume_remark', remark, not_updates, callback);
};

ResumeRemark.gets = function(resume_id, callback) {
    var sql = 'select * from job_resume_remark where resume_id=?';
    db.query(sql, [resume_id], callback);
};

ResumeRemark.get_by_resume_ids = function(resume_ids, callback) {
    if(!resume_ids || resume_ids.length == 0) {
        callback();
        return;
    }
    var qs = (new Array(resume_ids.length)).join('?,') + '?';
    db.query('select * from job_resume_remark where resume_id in (' + qs + ')', resume_ids, function(err, rows) {
        callback(err, rows);
    });
};