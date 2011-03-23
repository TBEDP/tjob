var Client = require('mysql').Client,
	config = require('./config.js');

Client.prototype.Literal = function(val) {
	this.value = val;
};

Client.prototype.literal = function(val) {
	return new this.Literal(val);
};

Client.prototype.escape = function(val) {
	if(val instanceof Client.prototype.Literal){ // 文本参数不作任何转换
		return val.value;
	}
	if (val === undefined || val === null) {
		return 'NULL';
	}

	switch (typeof val) {
	case 'boolean': return (val) ? 'true' : 'false';
	case 'number': return val+'';
	}

	if (typeof val === 'object') {
		val = val.toString();
	}

	val = val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
		switch(s) {
		case "\0": return "\\0";
		case "\n": return "\\n";
		case "\r": return "\\r";
		case "\b": return "\\b";
		case "\t": return "\\t";
		case "\x1a": return "\\Z";
		default: return "\\"+s;
		}
	});
	return "'"+val+"'";
};

/*
 * 添加一条记录到指定的表，若发现已存在，则更新
 * not_updates: 不更新的字段
 */
Client.prototype.insert_or_update = function(table, data, not_updates, callback) {
	if(!callback) {
		callback = not_updates;
		not_updates = null;
	}
	not_updates = not_updates || [];
	var sql = 'insert into ' + table + ' set ';
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
		sql += ' ON DUPLICATE KEY UPDATE ' + update_sql.substring(0, update_sql.length - 1);
	} else {
		sql += ' ON DUPLICATE KEY UPDATE 1=1';
	}
	this.query(sql, params, callback);
};

Client.prototype.get_obj = function(table, key_values, callback) {
	var conditions = [];
	var params = [];
	for(var k in key_values){
		conditions.push('`' + k + '`=?');
		params.push(key_values[k]);
	}
//	console.log('select * from ' + table + ' where ' 
//			+ conditions.join(' and '), params)
	mysql_db.query('select * from ' + table + ' where ' 
			+ conditions.join(' and '), params, 
			function(err, rows){
		var obj = null;
		if(err) {
			console.log(err);
		} else if(rows.length = 1){
			obj = rows[0];
		}
		callback(obj);
	});
};

Client.prototype.get_objs = function(table, key, values, callback) {
	var objs = {};
	if(values.length == 0) {
		callback(objs);
	} else {
		var qs = [];
		for(var i=0; i<values.length; i++){
			qs.push('?');
		}
//		console.log('select * from ' + table + ' where `' + key + '` in (' 
//				+ qs.join(',') + ')', values)
		mysql_db.query('select * from ' + table + ' where `' + key + '` in (' 
				+ qs.join(',') + ')', values, function(err, rows){
			if(err) {
				console.log(err);
			}
			rows.forEach(function(row){
				objs[row[key]] = row;
			});
			callback(objs);
		});
	}
};

var mysql_db = new Client(config.db_options);
mysql_db.connect();

module.exports.mysql_db = mysql_db;

//
//// 增加微博任务
//function add_weibo_tasks(tasks, callback) {
//	// tasks: [[method, params], ...]
//	var params = [];
//	tasks.forEach(function(task) {
//		params.push(task[0]);
//		params.push(JSON.strngify(task[1]));
//	});
//	// repeat sql by tasks.length times.
//	var sql = new Array(tasks.length).join('insert into weibo_task set method=?, params=?;');
//	mysql_db.query(sql, params, callback);
//};
//
//// 获取微任务
//function get_weibo_tasks(count, callback) {
//	mysql_db.query('select * from weibo_task limit ?', [count], function(err, rows){
//		if(err) {
//			console.error(err);
//		} else {
//			rows.forEach(function(row) {
//				row.params = JSON.parse(row.params);
//			});
//		}
//		callback(rows);
//	});
//};
//
//// 完成微博任务
//function finish_weibo_task(task_ids, callback) {
//	var qs = [];
//	for(var i=0;i<task_ids.length;i++) {
//		qs.push('?');
//	}
//	mysql_db.query('delete from weibo_task where id in (' + qs.join('?') + ')', task_ids, callback);
//};
//
//module.exports.add_weibo_tasks = add_weibo_tasks;
//module.exports.get_weibo_tasks = get_weibo_tasks;
//module.exports.finish_weibo_task = finish_weibo_task;