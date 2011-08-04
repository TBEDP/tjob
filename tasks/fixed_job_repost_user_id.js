// 修复job_repost表没有user_id格式不统一的问题
require.paths.push('/usr/lib/node/');

var db = require('../models/db').mysql_db;

db.query('select id, user_id from job_repost', function(err, rows){
	rows.forEach(function(row) {
		if(row.user_id.indexOf(':') < 0) {
			db.query('update job_repost set user_id=? where id=?', 
					['tsina:' + row.user_id, row.id], function(err, result){
				console.log(row.user_id, row);
			});
		}
	});
});