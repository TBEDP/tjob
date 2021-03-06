// 修复user表没有screen_name的问题
require.paths.push('/usr/lib/node/');

var db = require('../models/db').mysql_db;

db.query('select * from user', function(err, rows){
	rows.forEach(function(user) {
		if(user.screen_name == null) {
			var t_user = JSON.parse(user.info);
			var screen_name = t_user.screen_name;
			db.query('update user set screen_name=? where id=?', [screen_name, user.id], function(err, result){
				console.log(user.id, screen_name);
			});
		}
	});
});