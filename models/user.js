
var db = require('./db.js').mysql_db
  , config = require('../config')
  , tapi = config.tapi;

var User = module.exports = function User(props){
    
};

var INSERT_OR_UPDATE = 'INSERT INTO user(user_id, blogtype, `info`, screen_name, `role`, created_at) VALUES (?, ?, ?, ?, "user", now()) ' 
    + ' ON DUPLICATE KEY UPDATE `info`=VALUES(`info`), screen_name=values(screen_name);';
User.insert = function(user, callback) {
    var params = [user.user_id, user.blogtype, JSON.stringify(user), user.screen_name];
    db.query(INSERT_OR_UPDATE, params, callback);
};

User.update = function(id, props, callback) {
    props.id = id;
    db.update('user', 'id', props, callback);
};

User.get = function(user_id, callback) {
    db.get_obj('user', {user_id: user_id}, callback);
};

User.gets = User.get_users = function(user_ids, callback) {
    if(!user_ids || user_ids.length == 0) {
        callback();
        return;
    }
    var qs = (new Array(user_ids.length)).join('?,') + '?';
    db.query('select * from `user` where user_id in (' + qs + ')', user_ids, function(err, rows) {
        var users = {};
        if(rows) {
            for(var i=0; i<rows.length; i++) {
                var row = rows[i];
                var user = JSON.parse(row.info);
                user.user_role = row.role || '';
                users[user.user_id] = user;
            }
        }
        callback(err, users);
    });
};

User.list = function(offset, count, callback) {
    var sql = 'select * from user order by id desc limit ?, ?'
      , params = [offset, count];
    db.query(sql, params, callback);
};

User.search = function(query, callback) {
    query = db.escape(query.replace(/\?/g, ''));
    query = query.substring(1, query.length - 1).trim();
    if(!query) {
        return callback();
    }
    var sql = 'select id, screen_name, role, created_at, updated_at from user where screen_name like "%' + query + '%"';
    db.query(sql, callback);
};

User.search_friends = function(user_id, query, limit, callback) {
    query = db.escape(query.replace(/\?/g, ''));
    query = '%' + query.substring(1, query.length - 1).trim() + '%';
    var sql = 'select friend_screen_name from user_friends ' 
        + ' where user_id = ? and friend_screen_name like "' + query + '" limit ?';
    var params = [user_id, limit];
    db.query(sql, params, callback);
};

/**
 * 从微博中获取用户所跟随的人，并保存到数据库中
 *
 * @param {Object}user
 * @param {Number}count, 默认200个
 * @param {Number}cursor, 默认第一页。用于分页请求，请求第1页cursor传-1，
 * 在返回的结果中会得到next_cursor字段，表示下一页的cursor。
 * next_cursor为0表示已经到记录末尾。
 * @param {Function}callback
 * @api public
 */
User.fetch_user_friends = function(user, count, cursor, callback) {
    if(arguments.length == 2) {
        // 如果使用默认参数，则第二个参数就是callback
        callback = count;
        count = null;
    } else if(arguments.length == 3) {
        callback = cursor;
        cursor = null;
    }
    cursor = cursor == null ? -1 : cursor;
    count = count == null ? 200 : count;
    var params = {user: user, count: count, cursor: cursor};
    tapi.friends(params, function(err, data, res){
        if(err) {
            console.error(err);
            return callback(err, data);
        }
        // data = {users: {}, next_cursor: x}
        var friends = data && data.users || [];
        if(friends.length > 0) {
            var params = [], qs = [];
            var sql = 'INSERT INTO user_friends(user_id, friend_id, friend_screen_name, friend_user) values';
            for(var i=0;i<friends.length;i++) {
                var friend = friends[i];
                qs.push('(?, ?, ?, ?)');
                params.push(user.user_id, 
                    user.blogtype + ':' + friend.id,
                    friend.screen_name,
                    JSON.stringify(friend)
                );
            }
            sql += qs.join(',') + ' on duplicate key update friend_screen_name=values(friend_screen_name);'
                + ' update user set fetch_friends_cursor=? where user_id=?';
            var next_cursor = data.next_cursor || 0;
            params.push(next_cursor, user.user_id);
            db.query(sql, params, function(err, result){
                if(err) {
                    console.error(err);
                }
                callback(null, data);
            });
        } else {
            callback(err, data);
        }
    });
};

User.get_jobs = function(user_id, callback) {
    db.query('select * from job where author_id = ? and status = 0', [user_id], callback);
};