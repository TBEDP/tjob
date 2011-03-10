// 职位逻辑
var userutil = require('./user.js'),
	path = require('path'),
	fs = require('fs'),
	tapi = require('node-weibo');

var filedir = path.join(__dirname, 'files');
// 创建所有目录
function mkdirs(dirpath, mode, callback) {
	path.exists(dirpath, function(exists) {
		if(exists) {
			callback(dirpath);
		} else {
			//尝试创建父目录，然后再创建当前目录
			mkdirs(path.dirname(dirpath),mode, function(){
				fs.mkdir(dirpath, mode, callback);
			});
		}
	});
};

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
				userutil.get_users(app, user_ids, function(users) {
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

	app.post('/job/create', app.load_user_middleware, function(req, res) {
		var params = req.body;
		mysql_db.query('insert into job set title=?, `desc`=?, `text`=?, author_id=?, created_at=now()',
			[params.title, params.desc, params.text, req.cookies.tsina_token], 
			function(err, r, fields) {
				if(r && r.insertId) {
					var job_id = r.insertId;
					var redirect_url = '/job/' + job_id;
					// 使用当前登录用户发一条微博
					var status = params.desc;
					if(status.length > 130) {
						status = status.substring(0, 127) + '...';
					}
					status += ' ' + app.base_url + redirect_url;
					// 微博meta数据，方便跟踪对应到职位相关信息
					var annotations = JSON.stringify({job: job_id});
					tapi.update({user: req.users.tsina, status: status, annotations: annotations}, function(data){
						mysql_db.query('update job set weibo_id=?, weibo_info=?, last_check=now() where id=?', [data.id, JSON.stringify(data), job_id], function(err, result){
							res.redirect(redirect_url);
						});
						// 转发一条, 马上转发会被新浪api屏蔽报400错误，有定时任务来完成。
						// 然后转发，也顺便让用户有删除的机会
//						tapi.repost({user: userutil.tjob_user, id: data.id, status: '新职位推荐'}, function(repost_data){
//							console.log(repost_data);
//							if(repost_data.id) {
//								mysql_db.query('update job set repost_id=?, last_check=now() where id=?', [repost_data.id, job_id]);
//							}
//						});
					});
				}
			}
		);
	});
	
	app.post('/job/upload_resume/:job_id', function(req, res, next){
		// connect-form adds the req.form object
		// we can (optionally) define onComplete, passing
		// the exception (if any) fields parsed, and files parsed
		req.form.complete(function(err, fields, files){
			if (err) {
				next(err);
			} else {
				var job_id = req.params.job_id;
				// 暂时先用新浪微博帐号
				var user_id = req.cookies.tsina_token;
				var introducer = fields.introducer;
				var filepath = files.resume.filename;
				filepath = path.join('resume/' + job_id + '/' + user_id, filepath);
				var size = files.resume.size;
				// jobid/userid/filename
				var save_path = path.join(filedir, filepath);
				var data = [job_id, user_id, introducer, filepath, size];
				mkdirs(path.dirname(save_path), '777', function() {
					fs.rename(files.resume.path, save_path, function() {
						mysql_db.query('insert into job_resume(job_id, user_id, introducer, filepath, size, created_at) values(?, ?, ?, ?, ?, now())', data, function(err, result){
							if(err) {
								next(err);
							} else {
								res.redirect('/resume/' + job_id);
							}
						});
					});
				});
			}
		});
		// We can add listeners for several form
		// events such as "progress"introducer
//		req.form.on('progress', function(bytesReceived, bytesExpected){
//			var percent = (bytesReceived / bytesExpected * 100) | 0;
//			process.stdout.write('Uploading: %' + percent + '\r');
//		});
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