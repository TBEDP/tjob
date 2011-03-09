// 职位逻辑
var user = require('./user.js');

function get_jobs(app, condition, params, callback) {
	if(!params) {
		params = [];
	}
	app.mysql_db.query('select * from job ' + condition, params, function(err, result, fields) {
		if(!err) {
			if(result.length > 0) {
				var user_ids = [];
				for(var i=0; i<result.length; i++) {
					user_ids.push(result[i].author_id);
				}
				user.get_users(app, user_ids, function(users) {
					for(var i=0; i<result.length; i++) {
						result[i].author = users[result[i].author_id];
					}
					callback(result);
				});
			} else {
				callback(result);
			}
		} else {
			throw err;
		}
	});
};

function add(app) {
	var mysql_db = app.mysql_db;
	// 添加职位信息
	app.get('/job/create', app.load_user_middleware, function(req, res) {
		res.render('job/create.html', {
			layout: false, title: '发布职位信息 - 工作达人', users: req.users
		});
	});

	app.post('/job/create', function(req, res) {
		var params = req.body;
		mysql_db.query('insert into job set title=?, `desc`=?, `text`=?, author_id=?, created_at=now()',
			[params.title, params.desc, params.text, req.cookies.tsina_token], 
			function(err, r, fields) {
				if(r && r.insertId) {
					res.redirect('/job/' + r.insertId);
			}
		});
	});

	app.get('/job/:id', app.load_user_middleware, function(req, res) {
		get_jobs(app, 'where id=?', [req.params.id], function(result) {
			res.render('job/detail.html', {
				layout: false, title: '职位信息 - 工作达人', users: req.users,
				job: result[0]
			});
		});
//		mysql_db.query('select * from job where id=?', [req.params.id], function(err, result, fields) {
//			res.render('job/detail.html', {
//				layout: false, title: '职位信息 - 工作达人', users: req.users,
//				job: result[0]
//			});
//		});
	});
};

module.exports.add = add;
module.exports.get_jobs = get_jobs;