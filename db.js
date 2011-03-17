var Client = require('mysql').Client,
	config = require('./config.js');

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