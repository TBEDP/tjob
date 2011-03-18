// 招聘信息转发进程, 1分钟发送一次
// 到job表 repost_id 为空的记录发送
var tapi = require('node-weibo'),
	config = require('../config.js'),
	tjob_user = config.tjob_user;
var db = require('../db.js');
var mysql_db = db.mysql_db;

// 处理未发送成功的微博
function send_job_weibo(callback) {
	mysql_db.query('select * from job where weibo_id is null limit 10', function(err, rows){
		if(err) {
			console.error(err);
		}
		if(rows.length == 0){
			callback();
			return;
		}
		console.log('send_job_weibo', rows.length, 'rows');
		var finished = 0;
		function row_finished(){
			if(++finished == rows.length) {
				callback();
			}
		}
		rows.forEach(function(row){
			mysql_db.query('select * from user where user_id=?', 
					[row.author_id], function(err, rs){
				if(rs.length == 1) {
					var status = '招聘#' + row.title + '#: ' + row.desc;
					if(status.length > 120) {
						status = status.substring(0, 117) + '...';
					}
					var redirect_url = '/job/' + row.id;
					status += ' ' + config.base_url + redirect_url;
					var user = JSON.parse(rs[0].info);
					tapi.update({user: user, status: status}, function(data){
						if(data && data.id) {
							console.log(data.t_url, data.user.screen_name);
							mysql_db.query('update job set weibo_id=? where id=?', [data.id, row.id], function(){
								row_finished();
							});
						} else {
							// error: repeated weibo text
							if(data.error && data.error.indexOf('repeated weibo text') >= 0){
								mysql_db.query('update job set weibo_id=0, repost_id=0 where id=?', [row.id], function(){
									row_finished();
								});
							} else {
								console.error(data);
								mysql_db.query('update job set log=? where id=?', [JSON.stringify(data), row.id], function(){
									row_finished();
								});
							}
						}
					});
				}
			});
		});
	});
};

// 处理转发任务
function repost_job_weibo(callback){
	mysql_db.query('select id, title, weibo_id from job where weibo_id is not null and repost_id is null limit 1',
			function(err, rows){
		if(err) {
			console.error(err);
		}
		if(rows.length == 1) {
			console.log('repost_job_weibo', rows.length, 'rows');
			var job = rows[0];
			tapi.repost({user: tjob_user, id: job.weibo_id, status:'推荐职位 #' + job.title + '#'}, function(data){
				if(data && data.id) {
					mysql_db.query('update job set repost_id=? where id=?', [data.id, job.id], function(){
						callback();
					});
				} else {
					// error: repeated weibo text
					if(data.error && data.error.indexOf('repeated weibo text') >= 0){
						mysql_db.query('update job set repost_id=0 where id=?', [job.id], function(){
							callback();
						});
					} else {
						console.error(data);
						mysql_db.query('update job set log=? where id=?', [JSON.stringify(data), job.id], function(){
							callback();
						});
					}
				}
			});
		} else {
			callback();
		}
	});
};

// 处理微博的转发和评论统计，记录转发的用户
function job_total_count(callback) {
	var check_sql = 'select id, weibo_id, check_same_count, fetch_repost, repost_count, comment_count from job where (last_check is null or last_check<now()) and weibo_id is not null limit 50';
//	check_sql = 'select id, weibo_id, check_same_count, fetch_repost, repost_count, comment_count from job where weibo_id is not null limit 50';
	mysql_db.query(check_sql, 
			function(err, rows){
		if(err) {
			console.error(err);
		}
		if(rows.length > 0) {
			console.log('job_total_count', rows.length, 'rows');
			var jobs = {};
			rows.forEach(function(job){
				jobs[job.weibo_id] = job;
			});
			tapi.counts({user: tjob_user, ids: Object.keys(jobs).join(',')}, function(data){
				if(data.error) {
					console.error(data);
					callback();
				} else {
					var sql = 'update job set check_same_count=?, fetch_repost=?, repost_count=?, comment_count=?, last_check={last_check} where id=?;';
					var sqls = [], params = [];
					// 批量更新
					var infos = [];
					data.forEach(function(info){
						infos[String(info.id)] = info;
					});
					for(var weibo_id in jobs){
						var job = jobs[weibo_id];
						var info = infos[weibo_id];
						if(info && (info.comments != job.comment_count || info.rt != job.repost_count)) {
							// change
							job.check_same_count = 0;
							job.comment_count = info.comments;
							job.repost_count = info.rt;
							job.fetch_repost = 1;
							// 增加爬取任务
						} else {
							job.check_same_count++;
						}
						// 最大30分钟间隔
						sqls.push(sql.replace('{last_check}', 'DATE_ADD(now(), interval ' 
								+ (Math.max(2 * (job.check_same_count + 1), 30)) + ' minute)'));
						params = params.concat([job.check_same_count, job.fetch_repost, 
						                        job.repost_count, job.comment_count, job.id]);
					}
					mysql_db.query(sqls.join('\n'), params, function(err, result) {
						if(err) {
							console.error(err);
						}
						callback();
					});
				}
			});
		} else {
			callback();
		}
	});
};

function fetch_job_repost(callback) {
	// 获取转发相信信息，以便追踪
	mysql_db.query('select id, weibo_id, repost_since_id from job where fetch_repost=1 limit 20;', function(err, rows){
		if(err) {
			console.error(err);
		}
		if(rows.length >0) {
			console.log('fetch_job_repost', rows.length, 'rows');
			var finished = 0, results = [];
			rows.forEach(function(row){
				var params = {user: tjob_user, id: row.weibo_id};
				if(row.repost_since_id) {
					params.since_id = row.repost_since_id;
				}
				tapi.repost_timeline(params, function(statues){
					if(statues.error) {
						console.error(statues);
					} else {
						var sqls = [], args = [];
						var since_id = row.repost_since_id;
						statues.forEach(function(item) {
							console.log(item.user.screen_name, item.text);
							console.log(item.t_url);
							sqls.push('insert into job_repost set id=?, source_id=?, user_id=?, screen_name=?, weibo_info=?, created_at=now() ON DUPLICATE KEY UPDATE source_id=values(source_id), screen_name=values(screen_name), weibo_info=values(weibo_info);');
							if(!since_id || String(since_id) < String(item.id)) {
								since_id = String(item.id);
							}
							args.push(item.id, params.id, item.user.id, item.user.screen_name, JSON.stringify(item));
						});
						sqls.push('update job set fetch_repost=0, repost_since_id=? where id=?;');
						args.push(since_id, row.id);
					}
					mysql_db.query(sqls.join('\n'), args, function(err, result){
						if(err) {
							console.error(err);
						}
						results.push(result);
						if(++finished == rows.length) {
							callback();
						}
					});
				});
			});
		} else {
			callback();
		}
	});
};

var tasks = [send_job_weibo, repost_job_weibo, job_total_count, fetch_job_repost];
var finished = 0;
for(var i=0;i<tasks.length;i++){
	var task = tasks[i];
	task(function(){
		if(++finished == tasks.length){ // 全部完成
			process.exit();
		}
	});
}