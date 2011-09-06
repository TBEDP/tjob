
var db = require('./db').mysql_db
  , User = require('./user');

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
    db.get_obj('tag', {id: id}, function(err, tag) {
        if(err) {
            return callback(err);
        }
        // get tag users
        db.query('select user_id from tag_user where tag_id=?', [id], function(err, rows) {
            if(err) {
                return callback(err);
            }
            if(rows.length === 0) {
                return callback(null, tag);
            }
            var user_ids = [];
            for(var i = 0, l = rows.length; i < l; i++) {
                user_ids.push(rows[i].user_id);
            }
            User.gets(user_ids, function(err, users_map) {
                if(err) {
                    return callback(err);
                }
                tag.users = [];
                if(users_map) {
                    for(var k in users_map) {
                        tag.users.push(users_map[k]);
                    }
                }
                callback(null, tag);
            });
        });
    });
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

Tag.update_users = function(tag_id, users, callback) {
    db.query('delete from tag_user where tag_id = ?', [tag_id], function(err) {
        if(err) {
            return callback && callback(err);
        }
        if(typeof users === 'string') {
            users = [users];
        }
        if(!users || users.length === 0) {
            return callback && callback();
        }
        var count = users.length, error = null; 
        users.forEach(function(user_id) {
            db.insert_or_update('tag_user', {tag_id: tag_id, user_id: user_id}, function(err, result) {
                if(err) {
                    console.error(err);
                    callback && callback(err);
                    return false;
                }
                if(--count === 0) {
                    callback && callback(null, result);
                }
            });
        });
    });
};