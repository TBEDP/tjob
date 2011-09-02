
var db = require('./db.js').mysql_db;

var Tag = module.exports = function Tag(){
    
};

Tag.insert = function(tag, callback) {
    db.insert_or_update('tag', tag, callback);
};

Tag.update = function(id, props, callback) {
    props.id = id;
    db.update('tag', 'id', props, callback);
};

Tag.delete = function(tag, callback) {
    db.query('delete from tag where id=?;delete from tag_job where tag=?', [tag, tag], callback);
};

Tag.get = function(id, callback) {
    db.get_obj('tag', {id: id}, callback);
};

Tag.list = function(callback) {
    var sql = 'select * from tag order by count desc';
    db.query(sql, callback);
};

Tag.get_jobs = function(tag_id, pagging, callback) {
    var sql = 'select * from job where id in (select job from tag_job where tag=?) and status=0';
    db.query(sql, [tag_id], callback);
};

Tag.gets = function(ids, callback){
    if(!ids || ids.length == 0) {
        return callback();
    }
    var qs = (new Array(ids.length)).join('?,') + '?';
    db.query('select * from tag where id in (' + qs + ')', ids, callback);
};

Tag.update_count = function(tag_ids, callback) {
    var count = tag_ids.length; 
    tag_ids.forEach(function(tag_id) {
        db.query('update tag set count = (select count(id) from tag_job where tag=?) where id=?', 
                [tag_id, tag_id], function(err, result) {
            if(--count === 0) {
                callback && callback(err, result);
            }
        });
    });
};

Tag.add_job_tags = function(job_id, tag_ids, callback) {
    // 先获取旧的tags
    // 比较得到新增的tags和需要去除的tags
    // 增加tag和删除tag，更新tag的数据统计count字段
    if(tag_ids) {
        for(var i = 0, len = tag_ids.length; i < len; i++) {
            tag_ids[i] = parseInt(tag_ids[i]);
        }
    }
    tag_ids = tag_ids || [];
    this.get_job_tags(job_id, function(err, tags) {
        tags = tags || [];
        if(tags.length === 0 && tag_ids.length === 0) {
            return callback && callback();
        }
        var old_tags = [], delete_tags = [];
        for(var i = 0, len = tags.length; i < len; i++) {
            old_tags.push(tags[i].tag);
        }
        if(tag_ids.length === 0) {
            delete_tags = old_tags;
        } else {
            for(var i = 0, len = old_tags.length; i < len; i++) {
                var tag = old_tags[i];
                if(tag_ids.indexOf(tag) < 0) {
                    delete_tags.push(tag);
                }
            }
        }
        db.query('delete from tag_job where job=?', [job_id], function(err, result) {
            if(err) {
                console.error(err);
                return callback && callback(err);
            }
            if(tag_ids && tag_ids.length > 0) {
                var count = tag_ids.length; 
                tag_ids.forEach(function(tag_id) {
                    db.insert_or_update('tag_job', {job: job_id, tag: tag_id}, function(err, result) {
                        if(err) {
                            console.error(err);
                        }
                        if(--count === 0) {
                            Tag.update_count(tag_ids);
                            callback && callback(err, result);
                        }
                    });
                });
            } else {
                callback && callback();
            }
            if(delete_tags.length > 0) {
                Tag.update_count(delete_tags);
            }
        });
    });
};

Tag.get_job_tags = function(job_id, callback) {
    db.query('select tag from tag_job where job=?', [job_id], callback);
};