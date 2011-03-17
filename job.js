// 职位逻辑
var path = require('path'),
	fs = require('fs'),
	tapi = require('node-weibo'),
	userutil = require('./user.js'),
	utillib = require('./util.js');

var filedir = path.join(__dirname, 'files');
// 创建所有目录
function mkdirs(dirpath, mode, callback) {
	path.exists(dirpath, function(exists) {
		if(exists) {
			callback(dirpath);
		} else {
			//尝试创建父目录，然后再创建当前目录
			mkdirs(path.dirname(dirpath), mode, function(){
				fs.mkdir(dirpath, mode, callback);
			});
		}
	});
};

// 简历状态：0未读；1已读 2接受 3拒绝
var RESUME_STATUS = {
	0: '未读',
	1: '已读',
	2: '接受',
	3: '拒绝'
};

function get_jobs(app, condition, params, callback) {
	if(!params) {
		params = [];
	}
	app.mysql_db.query('select * from job ' + condition, params, function(err, result) {
		if(!err) {
			if(result.length > 0) {
				var user_ids = [];
				for(var i=0; i<result.length; i++) {
					user_ids.push(result[i].author_id);
					if(result[i].weibo_info) {
						result[i].weibo_info = JSON.parse(result[i].weibo_info);
					} else {
						result[i].weibo_info = {};
					}
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
	app.get('/job/create', app.load_user_middleware, userutil.require_author, function(req, res, next) {
		if(req.query.job) {
			mysql_db.query('select id, title, `desc`, `text`, author_id from job where id=?', [req.query.job], 
					function(err, rows){
				if(err) {
					next(err);
				}
				if(rows.length == 0 || rows[0].author_id != req.users.tsina.user_id) {
					res.redirect('/');
				} else {
					res.render('job/create.html', {
						title: '更新职位信息',
						job: rows[0]
					});
				}
			});
		} else {
			res.render('job/create.html', {
				title: '发布职位信息',
				job: {}
			});
		}
	});

	app.post('/job/create', app.load_user_middleware, userutil.require_author, function(req, res) {
		var params = req.body;
		if(params.id) {
			// 更新
			mysql_db.query('update job set title=?, `desc`=?, `text`=? where id=?',
					[params.title, params.desc, params.text, params.id], 
					function(err, r) {
				var redirect_url = '/job/' + params.id;
				res.redirect(redirect_url);
			});
		} else { // 新增
			mysql_db.query('insert into job set title=?, `desc`=?, `text`=?, author_id=?, created_at=now()',
				[params.title, params.desc, params.text, req.cookies.tsina_token], 
				function(err, r) {
					if(r && r.insertId) {
						var job_id = r.insertId;
						var redirect_url = '/job/' + job_id;
						// 使用当前登录用户发一条微博
						var status = '招聘#' + params.title + '#: ' + params.desc;
						if(status.length > 120) {
							status = status.substring(0, 117) + '...';
						}
						status += ' ' + app.base_url + redirect_url;
						// 微博meta数据，方便跟踪对应到职位相关信息
						var annotations = JSON.stringify({job: job_id});
						tapi.update({user: req.users.tsina, status: status, annotations: annotations}, function(data){
							mysql_db.query('update job set weibo_id=?, weibo_info=?, last_check=now() where id=?', [data.id, JSON.stringify(data), job_id], function(err, result){
								res.redirect(redirect_url);
							});
						});
					}
				}
			);
		}
	});
	
	app.get('/resume/list/:user_id', app.load_user_middleware, function(req, res, next){
		mysql_db.query('select * from job_resume where user_id=? order by id desc', 
				[req.params.user_id], function(err, rows){
			if(err) {
				next(err);
			} else {
				if(rows.length == 0) {
					return res.render('job/my_resume.html', {
						title: '我的简历', 
						resumes: []
					});
				}
				var user_ids = [], job_ids = [], qs = [];
				rows.forEach(function(row){
					user_ids.push(row.user_id);
					job_ids.push(row.job_id);
					qs.push('?');
				});
				userutil.get_users(app, user_ids, function(users){
					get_jobs(app, 'where id in (' + qs.join(',') + ')', job_ids, function(jobs){
						var job_map = {};
						jobs.forEach(function(job){
							job_map[job.id] = job;
						});
						// 填充数据
						rows.forEach(function(row){
							row.user = users[row.user_id];
							row.job = job_map[row.job_id];
							row.status_name = RESUME_STATUS[row.status];
							row.filename = path.basename(row.filepath);
						});
						res.render('job/my_resume.html', {
							title: '我的简历', 
							resumes: rows
						});
					});
				});
			}
		});
	});
	
	app.get('/download', function(req, res, next){
		var filepath = req.query.p;
		var filepath = path.join(filedir, filepath);
		res.download(filepath, encodeURI(path.basename(filepath)), function(err){
			// 取消下载
			// do nothing.
		});
	});
	
	app.post('/resume/upload/:job_id', function(req, res, next){
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
				if(introducer && introducer.indexOf('@') == 0) {
					introducer = introducer.substring(1);
				}
				var filepath = files.resume.filename;
				filepath = path.join('resume/' + job_id + '/' + user_id, filepath);
				var size = files.resume.size;
				// jobid/userid/filename
				var save_path = path.join(filedir, filepath);
				var data = [job_id, user_id, introducer, filepath, size];
				mkdirs(path.dirname(save_path), '777', function() {
					fs.rename(files.resume.path, save_path, function() {
						// job_id, user_id唯一，一个人对一个职位只能投递一份简历
						mysql_db.query('insert into job_resume(job_id, user_id, introducer, filepath, `size`, created_at) values(?, ?, ?, ?, ?, now()) '
								+ ' ON DUPLICATE KEY UPDATE `introducer`=values(`introducer`), filepath=values(filepath), `size`=values(`size`);', 
								data, function(err, result){
							if(err) {
								next(err);
							} else {
								if(result.affectedRows == 1) { // insert
									// 增加简历统计数目
									mysql_db.query('update job set resume_count=resume_count+1 where id=?', [job_id]);
								}
								res.redirect('/resume/list/' + user_id);
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
	
	function _get_resume(job_id, user_id, callback) {
		if(user_id) {
			mysql_db.query('select * from job_resume where job_id=? and user_id=?', [job_id, user_id],
					function(err, rows){
				if(err){
					next(err);
				} else {
					var resume = null;
					if(rows.length > 0) {
						resume = rows[0];
						resume.filename = path.basename(resume.filepath);
					}
					callback(resume);
				}
			});
		} else {
			callback(null);
		}
	};
	app.get('/job/:id', app.load_user_middleware, function(req, res) {
		var job_id = req.params.id;
		get_jobs(app, 'where id=?', [job_id], function(rows) {
			if(rows.length > 0) {
				// 如果用户已经登录，则判断用户是否提交过简历
				_get_resume(job_id, req.cookies.tsina_token, function(resume){
					res.render('job/detail.html', {
						title: '职位信息', 
						resume: resume,
						job: rows[0]
					});
				});
			} else {
				next();
			}
		});
	});
	
	app.get('/job/:id/repost_users/:source_id', function(req, res, next){
		mysql_db.query('select distinct(screen_name) from job_repost where source_id=?', 
				[req.params.source_id], function(err, rows){
			if(err) {
				next(err);
			} else {
				res.send(JSON.stringify(rows));
			}
		});
	});
	
	// 更新
	app.post('/job/:id', app.load_user_middleware, userutil.require_author, function(req, res, next){
		var status = req.body.status || '0';
//		if(status == '1') {
//			// 结束，发一条评论
//		}
		mysql_db.query('update job set status=? where id=? and author_id=?', 
				[status, req.params.id, req.cookies.tsina_token],
				function(err, result){
			if(err){
				next(err);
			} else {
				res.send('1');
			}
		});
	});
	
	app.get('/resumes', app.load_user_middleware, userutil.require_author, function(req, res, next){
		var status = req.query.status || '0'; // 默认未读
		var params = [];
		var sql = 'select * from job_resume';
		if(status != 'all') {
			sql += ' where status=?';
			params.push(status);
		}
		if(req.query.job) {
			if(sql.indexOf('where ') < 0) {
				sql += ' where ';
			} else {
				sql += ' and ';
			}
			sql += ' job_id=?';
			params.push(req.query.job);
		}
		sql += ' limit ?, ?';
		var pagging = utillib.get_pagging(req);
		params.push(pagging.offset, pagging.count);
		mysql_db.query(sql, params, function(err, rows){
			if(err) {
				next(err);
			} else {
				var locals = {
					title: '简历列表', 
					resumes: rows,
					job_id: req.query.job,
					filter_status: status,
					page_count: pagging.count,
					prev_offset: pagging.prev_offset
				};
				if(rows.length == pagging.count) {
					locals.next_offset = pagging.next_offset;
				}
				if(rows.length == 0) {
					res.render('resumelist.html', locals);
					return;
				}
				var user_ids = [], job_ids = [], qs = [];
				rows.forEach(function(row){
					user_ids.push(row.user_id);
					job_ids.push(row.job_id);
					qs.push('?');
				});
				userutil.get_users(app, user_ids, function(users){
					get_jobs(app, 'where id in (' + qs.join(',') + ')', job_ids, function(jobs){
						var job_map = {};
						jobs.forEach(function(job){
							job_map[job.id] = job;
						});
						// 填充数据
						rows.forEach(function(row){
							row.user = users[row.user_id];
							row.job = job_map[row.job_id];
							row.status_name = RESUME_STATUS[row.status];
							row.filename = path.basename(row.filepath);
						});
						res.render('resumelist.html', locals);
					});
				});
			}
		});
	});
	
	app.post('/resumes/update/:id', app.load_user_middleware, userutil.require_author, function(req, res, next){
		var status = req.body.status;
		mysql_db.query('update job_resume set status=? where id=?', [status, req.params.id], 
				function(err, result){
			if(err){
				next(err);
			} else {
				res.send('1');
			}
		});
	});
};

module.exports.add = add;
module.exports.get_jobs = get_jobs;