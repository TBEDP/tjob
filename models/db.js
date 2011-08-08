var mysql = require('mysql'),
    Client = mysql.Client,
	config = require('../config.js');

var Literal = function(val) {
	this.value = val;
};

Client.prototype.literal = function(val) {
	return new Literal(val);
};

Client.prototype.__escape = Client.prototype.escape;
Client.prototype.escape = function(val) {
	if(val instanceof Literal){ // 文本参数不作任何转换
		return val.value;
	}
	return Client.prototype.__escape.call(this, val);
};

/*
 * 添加一条记录到指定的表，若发现已存在，则更新
 * not_updates: 不更新的字段
 * 
 */
Client.prototype.insert_or_update = function(table, data, not_updates, callback) {
	if(!callback) {
		callback = not_updates;
		not_updates = null;
	}
	not_updates = not_updates || [];
	var sql = table + ' set ';
	var update_sql = '';
	var params = [];
	for(var k in data) {
		sql += ' `' + k + '`=?,';
		params.push(data[k]);
		if(not_updates.indexOf(k) < 0) {
			update_sql += ' `' + k + '`=values(`' + k + '`),';
		}
	}
	sql = sql.substring(0, sql.length - 1);
	if(update_sql) {
		sql = 'INSERT INTO ' + sql + ' ON DUPLICATE KEY UPDATE ' + update_sql.substring(0, update_sql.length - 1);
	} else {
		sql += 'INSERT IGNORE INTO ' + sql;
	}
	this.query(sql, params, callback);
};

Client.prototype.update = function(table, keys, data, callback) {
	var sql = 'update ' + table + ' set ';
	if(typeof keys === 'string') {
		keys = [keys];
	}
	var wheres = [];
	var params = [];
	for(var k in data) {
		if(keys.indexOf(k) < 0) {
			sql += ' `' + k + '`=?,';
			params.push(data[k]);
		}
	}
	sql = sql.substring(0, sql.length - 1);
	var values = [];
	keys.forEach(function(key) {
		wheres.push(key + '=?');
		values.push(data[key]);
	});
	sql += ' where ' + wheres.join(' and ');
	this.query(sql, params.concat(values), callback);
};

Client.prototype.get_obj = function(table, key_values, callback) {
	var conditions = [];
	var params = [];
	for(var k in key_values){
		conditions.push('`' + k + '`=?');
		params.push(key_values[k]);
	}
	var sql = 'select * from ' + table + ' where ' + conditions.join(' and ');
	mysql_db.query(sql, params, function(err, rows){
	    var row = null;
		if(rows && rows.length > 0){
		    row = rows[0];
		}
		callback(err, row);
	});
};

Client.prototype.get_objs = function(table, key, values, callback) {
	if(!values || values.length === 0) {
		return callback();
	}
	var qs = [];
    for(var i=0; i<values.length; i++){
        qs.push('?');
    }
    var sql = 'select * from ' + table + ' where `' + key + '` in (' 
        + qs.join(',') + ')';
    mysql_db.query(sql, values, function(err, rows) {
        var objs = null;
        if(rows) {
            objs = {};
            rows.forEach(function(row){
                objs[row[key]] = row;
            });
        }
        callback(err, objs);
    });
};

var mysql_db = mysql.createClient(config.db_options);
//mysql_db.connect(function(err) {
//    if(err) {
//        console.error('connect db ' + mysql_db.host + ' error: ' + err);
//        process.exit();
//    }
//});

exports.mysql_db = mysql_db;