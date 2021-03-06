// 招聘信息转发进程, 1分钟发送一次
// 到job表 repost_id 为空的记录发送
//require.paths.unshift(__dirname + '/../support');

var config = require('../config'),
	tapi = config.tapi,
	EventProxy = require('../lib/eventproxy').EventProxy,
	format_weibo_status = require('../models/job').format_weibo_status,
	User = require('../models/user'),
	tjob_user = config.tjob_user;
var mysql_db = require('../models/db').mysql_db;

// 处理未发送成功的微博
function send_job_weibo(callback) {
	mysql_db.query('select * from job where (weibo_id is null or weibo_id="") and repost_id is null limit 10', function(err, rows){
		if(err) {
			console.error(err);
		}
		if(!rows || rows.length == 0){
			callback();
			return;
		}
		console.log('send_job_weibo start', rows.length, 'rows');
		var ep = new EventProxy();
		var events = [];
		for(var i = 0, len = rows.length; i < len; i++) {
		    events.push('send' + i);
		}
		events.push(function() {
		    console.log('send_job_weibo done');
		    callback();
		});
		ep.assign.apply(ep, events);
		rows.forEach(function(row, index){
		    var row_finished = function() {
		        ep.emit('send' + index);
		    };
		    if(!row.author_id) {
		        // 删除错误数据
		        console.error('no user', row.author_id, 'delete job', row.id, row.title);
		        mysql_db.query('delete from job where id=?', [row.id], function() {
		            row_finished();
	            });
		        return;
            }
			User.get(row.author_id, function(err, user){
			    if(err || !user) {
			        console.error('no user', row.author_id);
			        return row_finished();
			    }
			    var params = format_weibo_status(row, row.id);
			    params.user = JSON.parse(user.info);
                //console.log(user.screen_name, params.status, row);
                tapi.update(params, function(error, data) {
                    if(data && data.id) {
                        console.log(data.t_url, data.user.screen_name);
                        mysql_db.query('update job set weibo_id=? where id=?', [data.id, row.id], function(){
                            row_finished();
                        });
                    } else {
                        // error: repeated weibo text
                        if(error && typeof error.message === 'object') {
                            error = error.message;
                        }
                        if(error && (error.message.indexOf('repeated weibo text') >= 0 
                                || error.message.indexOf('40028:') >= 0 
                                || error.message.indexOf('40072:') >= 0 
                                || error.message.indexOf('target weibo does not exist'))){
                            mysql_db.query('update job set weibo_id=0, repost_id=0 where id=?', [row.id], function(){
                                row_finished();
                            });
                        } else {
                            console.log(error, row.id, row.title);
                            mysql_db.query('update job set log=? where id=?', [JSON.stringify(data), row.id], function(){
                                row_finished();
                            });
                        }
                    }
                });
			});
		});
	});
};

// 处理转发任务
function repost_job_weibo(callback){
    var sql = 'select id, title, weibo_id from job where weibo_id is not null and repost_id is null limit 1';
	mysql_db.query(sql, function(err, rows){
		if(err || rows.length === 0) {
		    err && console.error(err);
			return callback();
		}
		console.log('repost_job_weibo', rows.length, 'rows');
        var job = rows[0];
        tapi.repost({user: tjob_user, id: job.weibo_id, 
                status:'推荐职位 #' + job.title + '#'}, function(error, data, res){
            if(data && data.id) {
                console.log(data.t_url);
                mysql_db.query('update job set repost_id=? where id=?', [data.id, job.id], function(){
                    callback();
                });
            } else {
                // error: repeated weibo text
                if(error && typeof error.message === 'object') {
                    error = error.message;
                }
                if(error && (error.message.indexOf('repeated weibo text') >= 0 
                        || error.message.indexOf('40028:') >= 0 
                        || error.message.indexOf('40072:') >= 0 
                        || error.message.indexOf('target weibo does not exist'))){
                    mysql_db.query('update job set repost_id=0 where id=?', [job.id], function(){
                        callback();
                    });
                } else {
                    console.log(error, row.id, row.title);
                    mysql_db.query('update job set log=? where id=?', [JSON.stringify(data), job.id], function(){
                        callback();
                    });
                }
            }
        });
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
			tapi.counts({user: tjob_user, ids: Object.keys(jobs).join(',')}, 
					function(error, data) {
				if(error) {
					console.error('tapi.counts error:', error);
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
							// 5次循环
							if(job.check_same_count > 5) {
								job.check_same_count = 0;
							}
							// 先尽快获取一次
							if(job.check_same_count % 2 == 0) {
								job.fetch_repost = 1;
							}
						}
						// 最大30分钟间隔
						sqls.push(sql.replace('{last_check}', 'DATE_ADD(now(), interval ' 
								+ (Math.min(job.check_same_count + 1, 30)) + ' minute)'));
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
				var sqls = [], args = [];
				var params = {user: tjob_user, id: row.weibo_id, count: 200};
				if(row.repost_since_id) {
					params.since_id = row.repost_since_id;
				}
				tapi.repost_timeline(params, function(error, statues){
					if(error) {
						console.error(error);
					} else {
						if(statues.length > 0){
							console.log('fetch_job_repost', row.weibo_id, 'reposts', statues.length);
						}
						var since_id = row.repost_since_id;
						statues.forEach(function(item) {
							//console.log(item.user.screen_name, item.text);
							//console.log(item.t_url);
							sqls.push('insert into job_repost set id=?, source_id=?, user_id=?, screen_name=?, weibo_info=?, created_at=now() ' 
								+ ' ON DUPLICATE KEY UPDATE source_id=values(source_id), user_id=values(user_id), screen_name=values(screen_name), weibo_info=values(weibo_info);');
							if(!since_id || String(since_id) < String(item.id)) {
								since_id = String(item.id);
							}
							args.push(item.id, params.id, 
									tjob_user.blogtype + ':' + item.user.id, 
									item.user.screen_name, 
									JSON.stringify(item));
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

function _fetch_friends(user, cursor, fetch_all, callback) {
	//console.log('fetching', user.screen_name);
	User.fetch_user_friends(user, 200, cursor, function(err, data) {
	    if(fetch_all && data && data.next_cursor) {
		    // TODO 递归？！
		   // console.log('fetch', user.screen_name, data.users.length, 'friends');
		    _fetch_friends(user, data.next_cursor, true, callback);
	    } else {
		    console.error('_fetch_friends', user.screen_name, 'error', err);
		    callback(err);
	    }
	});
};


/**
 * 定时爬取用户跟随者
 *
 * @api public
 */
function fetch_weibo_user_friends(callback) {
	var update_fetch_date = 'update user set fetch_friends_date=DATE_ADD(now(), interval 10 minute) where user_id=?;';
	var sql = 'select * from user where fetch_friends_date is null or fetch_friends_date < now() limit 20';
	mysql_db.query(sql, function(err, rows){
		if(err) {
			console.error(err);
			callback();
		} else {
			if(rows.length == 0) {
				callback();
			} else {
				console.log('fetch ' + rows.length +' user friends');
				var finished = 0;
				rows.forEach(function(user){
					var info = JSON.parse(user.info);
					Object.extend(user, info);
					var fetch_all = user.fetch_friends_date == null; //没有爬取过，则是第一次爬取，爬全部的
					_fetch_friends(user, -1, fetch_all, function(err, data){
						mysql_db.query(update_fetch_date, [user.user_id], function(err, result){
							if(err) {
								console.error(err);
							}
							if(++finished == rows.length) {
								callback();
							}
						});
					});
				});
			}
		}
	});
};

var tasks = [
     send_job_weibo, 
     repost_job_weibo, 
     job_total_count, 
     fetch_job_repost, 
     fetch_weibo_user_friends
];
var finished = 0, total = tasks.length;
tasks.forEach(function(task, index) {
    console.log('doing', task.name);
    task(function() {
        console.log('finished', task.name);
        if(++finished == total){ // 全部完成
            process.exit();
        }
    });
});
