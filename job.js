// 职位逻辑
var path = require('path'),
	fs = require('fs'),
	tapi = require('node-weibo'),
	userutil = require('./user.js'),
	utillib = require('./public/js/util.js'),
	mysql_db = require('./db.js').mysql_db,
	config = require('./config.js'),
	question_answer = require('./question.js');

var filedir =config.filedir;

// 简历状态：0未读；1已读 2接受 3拒绝
var RESUME_STATUS = {
	0: '未读',
	1: '已读',
	2: '接受',
	3: '拒绝'
};

// 获取job详细信息，包含问题等
var get_job = module.exports.get_job = function(id, callback) {
	if(!id) {
		callback(null);
	} else {
		mysql_db.get_obj('job', {id: id}, function(job){
			if(job) {
				// 获取用户
				userutil.get_user(job.author_id, function(author) {
					job.author = author;
					callback(job);
				});
			} else {
				callback(job);
			}
		});
	}
};

function get_jobs(condition, params, callback) {
	if(!params) {
		params = [];
	}
	mysql_db.query('select * from job ' + condition, params, function(err, result) {
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
				userutil.get_users(user_ids, function(users) {
					for(var i=0; i<result.length; i++) {
						result[i].author = users[result[i].author_id];
					}
					callback(result);
				});
			} else {
				callback(result);
			}
		} else {
			callback(result);
			console.error(err);
		}
	});
};

// 检测用户是否喜欢这些job
var check_likes = module.exports.check_likes = function(user_id, job_ids, callback) {
	var likes = {};
	if(!user_id || !job_ids || 0 == job_ids.length) {
		callback(likes);
	} else {
		var qs = [];
		job_ids.forEach(function(){
			qs.push('?');
		});
		mysql_db.query('select job_id from job_like where job_id in (' 
				+ qs.join(',') + ') and user_id=?',
				job_ids.concat(user_id), function(err, rows){
			if(err) {
				console.error(err);
			}
			rows.forEach(function(row){
				likes[row.job_id] = true;
			});
			callback(likes);
		});
	}
};

// 格式化微博正文
var format_weibo_status = module.exports.format_weibo_status = function(params, job_id) {
	var redirect_url = '/job/' + job_id;
	// 使用当前登录用户发一条微博
	var status = '招聘#' + params.title + '#: ' + params.desc;
	if(status.length > 120) {
		status = status.substring(0, 117) + '...';
	}
	status += ' ' + config.base_url + redirect_url;
	// 微博meta数据，方便跟踪对应到职位相关信息
	var annotations = JSON.stringify({job: job_id});
	return {status: status, annotations: annotations};
};

function add(app) {
	// 添加职位信息
	app.get('/job/create', userutil.load_user_middleware, userutil.require_author, 
			function(req, res, next) {
		if(req.query.job) {
			get_job(req.query.job, function(job){
				var user_id = req.users.tsina.user_id;
				if(!job || job.author_id != user_id) {
					res.redirect('/');
				} else {
					res.render('job/create.html', {
						title: '更新职位信息',
						job: job
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
	
	function _insert_job(args, cb){
			var sql = 'insert into job set title=?, `desc`=?, `text`=?, author_id=?, created_at=now()', 
			ps = [args.title, args.desc, args.text, args.author_id];
		if(args.question_id) {
			sql += ', question_id=?';
			ps.push(args.question_id);
		}
		mysql_db.query(sql, ps, cb);
	};
	
	function _add_job(params, callback){
		params.need_question = params.need_question == '1';
		if(params.need_question) {
			question_answer.save_question({
				content: params.question,
				author: params.author_id
			}, function(question_id){
				params.question_id = question_id;
				_insert_job(params, callback);
			});
		} else {
			_insert_job(params, callback);
		}
	};
	
	app.post('/job/create', userutil.load_user_middleware, userutil.require_author, function(req, res) {
		var params = req.body;
		params.author_id = req.cookies.tsina_token;
		if(params.id) {
			// 更新
			mysql_db.query('update job set title=?, `desc`=?, `text`=? where id=?',
					[params.title, params.desc, params.text, params.id], 
					function(err, r) {
				var redirect_url = '/job/' + params.id;
				res.redirect(redirect_url);
			});
		} else { // 新增
			_add_job(params, function(err, r) {
				if(r && r.insertId) {
					var job_id = r.insertId;
					var redirect_url = '/job/' + job_id;
					// 使用当前登录用户发一条微博
					var data = format_weibo_status(params, job_id);
					data.user = req.users.tsina;
					tapi.update(data, function(data){
						mysql_db.query('update job set weibo_id=?, weibo_info=?, last_check=now() where id=?', 
								[data.id, JSON.stringify(data), job_id], function(err, result){
							res.redirect(redirect_url);
						});
					});
				}
			});
		}
	});
	
	function _get_user(current_user, user_id, callback) {
		// 未登录用户，或者不是当前用户，或者不是职位发布人，都无法查看用户的简历
		if(!current_user || (current_user.user_id != user_id && !current_user.is_author)) {
			callback(null);
			return;
		}
		if(current_user.user_id == user_id) {
			callback(current_user);
		} else {
			userutil.get_users([user_id], function(users){
				callback(users[user_id]);
			});
		}
	};
	
	// 查看当前用户投递的简历
	app.get('/resume/list/:user_id', userutil.load_user_middleware, function(req, res, next){
		var user_id = req.params.user_id;
		_get_user(req.users.tsina, user_id, function(resume_user){
			if(!resume_user) {
				res.redirect('/');
				return;
			}
			var locals =  {
				title: '我的简历', 
				resume_user: resume_user,
				resumes: []
			};
			mysql_db.query('select * from job_resume where user_id=? order by id desc', 
					[user_id], function(err, rows){
				if(err) {
					next(err);
				} else {
					if(rows.length == 0) {
						res.render('job/my_resume.html', locals);
						return;
					}
					var job_ids = [], qs = [], answer_ids = [];
					rows.forEach(function(row){
						job_ids.push(row.job_id);
						if(row.answer_id) {
							answer_ids.push(row.answer_id);
						}
						qs.push('?');
					});
					utillib.waitfor([get_jobs, 'where id in (' + qs.join(',') + ')', 
					                 job_ids, function(jobs){
						var job_map = {};
						jobs.forEach(function(job){
							job_map[job.id] = job;
						});
						// 填充数据
						rows.forEach(function(row){
							row.user = resume_user;
							row.job = job_map[row.job_id];
							row.status_name = RESUME_STATUS[row.status];
							row.filename = path.basename(row.filepath);
						});
					}], 
					[question_answer.get_answers, answer_ids, function(answers){
						rows.forEach(function(row){
							if(row.answer_id) {
								row.answer = answers[row.answer_id];
							}
						});
					}], 
					function(){
						locals.resumes = rows;
						res.render('job/my_resume.html', locals);
					});
				}
			});
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
	
	// 保存文件
	function _save_file(from_path, to_path, callback) {
		utillib.mkdirs(path.dirname(to_path), '777', function() {
			fs.rename(from_path, to_path, callback);
		});
	};
	
	function _save_resume(params, callback){
		var data = {
			job_id: params.job_id,
			user_id: params.user_id,
			introducer: params.introducer,
			filepath: params.filepath,
			size: params.size,
			created_at: mysql_db.literal('now()')
		};
		if(params.question_id && params.answer) {
			var answer = {
				content: params.answer,
				author: params.user_id,
				question_id: params.question_id
			};
			if(params.answer_id) {
				// for update
				answer.id = params.answer_id;
			}
			question_answer.save_answer(answer, function(answer_id){
				data.answer_id = answer_id;
				mysql_db.insert_or_update('job_resume', data, ['created_at'], callback);
			});
		} else {
			mysql_db.insert_or_update('job_resume', data, ['created_at'], callback);
		}
	};
	
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
				var params = {
					job_id: job_id,
					user_id: user_id,
					introducer: introducer,
					filepath: filepath,
					size: size,
					question_id: fields.question_id,
					answer: fields.answer,
					answer_id: fields.answer_id
				};
				_save_file(files.resume.path, save_path, function() {
					_save_resume(params, function(err, result){
						// job_id, user_id唯一，一个人对一个职位只能投递一份简历
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
			}
		});
	});
	
	function _get_resume(job_id, user_id, callback) {
		if(user_id) {
			mysql_db.get_obj('job_resume', {job_id: job_id, user_id: user_id}, 
					function(resume){
				if(resume) {
					resume.filename = path.basename(resume.filepath);
					question_answer.get_answer(resume.answer_id, function(answer){
						resume.answer = answer;
						callback(resume);
					});
				} else {
					callback(null);
				}
			});
		} else {
			callback(null);
		}
	};
	
	app.get('/job/:id', userutil.load_user_middleware, function(req, res, next) {
		var job_id = req.params.id;
		var locals = {title: '职位信息', resume: null, job: null};
		get_job(job_id, function(job) {
			locals.job = job;
			if(job && job.id) {
				var user_id = req.cookies.tsina_token;
				if(user_id) {
					// 如果用户已经登录，则判断用户是否提交过简历
					utillib.waitfor(
					[_get_resume, job_id, user_id, function(resume){
						locals.resume = resume;
					}], 
					[check_likes, user_id, [job_id], function(likes){
						locals.job.user_like = likes[job.id];
					}], function(){
						res.render('job/detail.html', locals);
					});
				} else {
					res.render('job/detail.html', locals);
				}
			} else {
				next();
			}
		});
	});
	
//	app.get('/job/:id/repost_users/:source_id', function(req, res, next){
//		mysql_db.query('select distinct(screen_name) from job_repost where source_id=?', 
//				[req.params.source_id], function(err, rows){
//			if(err) {
//				next(err);
//			} else {
//				var users = {};
//				rows.forEach(function(row) {
//					users[row.screen_name] = 1;
//				});
//				res.send(JSON.stringify(users));
//			}
//		});
//	});
	
	// 获取实时更新
	app.get('/job/:id/repost_users/:source_id', userutil.load_user_middleware, function(req, res, next){
		mysql_db.query('select distinct(screen_name) from job_repost where source_id=?', 
				[req.params.source_id], function(err, rows){
			if(err) {
				next(err);
			} else {
				var users = {};
				rows.forEach(function(row) {
					users[row.screen_name] = 1;
				});
				res.send(JSON.stringify(users));
			}
		});
//		if(req.users.tsina) {
//			tapi.repost_timeline({user: req.users.tsina, id: req.params.source_id}, function(data){
//				var users = {};
//				data.forEach(function(status){
//					users[status.user.screen_name] = 1;
//				});
//				res.send(JSON.stringify(users));
//			});
//		} else {
//			mysql_db.query('select distinct(screen_name) from job_repost where source_id=?', 
//					[req.params.source_id], function(err, rows){
//				if(err) {
//					next(err);
//				} else {
//					var users = {};
//					rows.forEach(function(row) {
//						users[row.screen_name] = 1;
//					});
//					res.send(JSON.stringify(users));
//				}
//			});
//		}
	});
	
	// 更新
	app.post('/job/:id', userutil.load_user_middleware, userutil.require_author, function(req, res, next){
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
	
	app.get('/resumes', userutil.load_user_middleware, userutil.require_author, function(req, res, next){
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
				userutil.get_users(user_ids, function(users){
					get_jobs('where id in (' + qs.join(',') + ')', job_ids, function(jobs){
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
	
	app.post('/resumes/update/:id', userutil.load_user_middleware, userutil.require_author, function(req, res, next){
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
	
	// 热门职位
	app.get('/job/hot', function(req, res, next){
		mysql_db.query('select id, title from job where status=0 order by resume_count desc, repost_count desc limit 10;',
				function(err, rows){
			if(err) {
				next(err);
			} else {
				res.send(JSON.stringify(rows));
			}
		});
	});
	
	// 职位搜索
	app.get('/job/search', function(req, res, next){
		var query = req.query.q;
		var locals = {
			title: query + ' - 职位搜索',
			query: query,
			jobs: []
		};
		if(!query) {
			res.render('index.html', locals);
		} else {
			query = mysql_db.escape(query.replace(/\?/g, ''));
			query = query.substring(1, query.length - 1); // remove '
//			console.log('where title like "%?%" or `desc` like "%?%" '.replace(/\?/g, query));
			get_jobs('where title like "%?%" or `desc` like "%?%" '.replace(/\?/g, query), [], function(rows){
				locals.jobs = rows;
				res.render('index.html', locals);
			});
		}
	});
	
	/* 我喜欢此职位接口
	 * return: 
	 *     1:未知用户, 2:异常, 0: 成功.
	 */ 
	app.get('/job/like/:id', function(req, res){
		var job_id = req.params.id;
		var user_id = req.cookies.tsina_token;
		if(user_id) {
			mysql_db.query('insert IGNORE into job_like set job_id=?, user_id=?;'
					+ 'update job set like_count=like_count+1 where id=?;',
					[job_id, user_id, job_id],
					function(err, result){
				if(err) {
					console.error(err);
				}
				console.log(result);
				res.send('0');
			});
		} else {
			res.send('1');
		}
	});
	
	app.get('/job/unlike/:id', function(req, res){
		var job_id = req.params.id;
		var user_id = req.cookies.tsina_token;
		if(user_id) {
			mysql_db.query('delete from job_like where job_id=? and user_id=?;'
					+ 'update job set like_count=like_count-1 where id=?;',
					[job_id, user_id, job_id],
					function(err, result){
				if(err) {
					console.error(err);
					res.send('2');
				} else {
					res.send('0');
				}
			});
		} else {
			res.send('1');
		}
	});
};

module.exports.add = add;
module.exports.get_jobs = get_jobs;