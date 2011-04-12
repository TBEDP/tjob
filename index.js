// tjob web
// fixed node module paths problem;
require.paths.unshift(__dirname + '/support');

var express = require('express'),
	path = require('path'),
	fs = require('fs'),
	form = require('connect-form'),
	config = require('./config.js'),
	tapi = config.tapi,
	utillib = require('./public/js/util.js'),
	userutil = require('./user.js'),
	uploadfile = require('./lib/uploadfile'),
	job_handler = require('./job.js');

//fixed express download cancel bug:
require('http').ServerResponse.prototype.download = function(path, filename, fn){
	var self = this;
	// support callback as second arg
	if ('function' == typeof filename) {
		fn = filename;
		filename = null;
	}
	// transfer the file
	this.attachment(filename || path).sendfile(path, function(err){
	    //if (err) self.removeHeader('Content-Disposition');
		if (fn) return fn(err);
		if (err) {
		self.req.next('ENOENT' == err.code
	        ? null
	        : err);
	    }
	});
};

// set weibo appkey
tapi.init('tsina', '4010445928', 'd119f62bfb70a4ba8d9b68bf14d6e45a');

var app = express.createServer(
	form({ keepExtensions: true })
);

// 一个月过期
app.use(express.static(__dirname + '/public', {maxAge: 3600000 * 24 * 30}));
app.use(express.cookieParser());
app.use(express.bodyParser());

//日志格式
var log_path = path.join(__dirname, 'web.log');
var log_write_stream = fs.createWriteStream(log_path, {flags: 'a'});
process.on('exit', function(){
	console.log('process exit, log end()');
	log_write_stream.end();
});
var logger_options = {
	format: ':http-version|:method|:url|:status|:response-time|:remote-addr|:referrer|:date|:user-agent',
	stream: log_write_stream
};
app.use(express.logger(logger_options));

app.use(express.errorHandler({ dumpExceptions: true }));
//app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));

// use jqtpl in express
app.set("view engine", "html");
app.set('view options', {
	layout: 'layout.html'
});
app.register(".html", require("jqtpl"));

// 用户认证
userutil.auth(app);

app.get('/', userutil.load_user_middleware, function(req, res){
	var pagging = utillib.get_pagging(req);
	job_handler.get_jobs('where status=0 order by id desc limit ?, ?', [pagging.offset, pagging.count], function(rows) {
		var locals = {
			jobs: rows,
			page_count: pagging.count,
			prev_offset: pagging.prev_offset
		};
		if(rows.length == pagging.count) {
			locals.next_offset = pagging.next_offset;
		}
		if(req.users.tsina && rows.length > 0) {
			// 判断当前用户是否喜欢
			var job_ids = [];
			rows.forEach(function(row) {
				job_ids.push(row.id);
			});
			job_handler.check_likes(req.users.tsina.user_id, job_ids, function(likes){
				rows.forEach(function(row) {
					row.user_like = likes[row.id];
				});
				res.render('index.html', locals);
			});
		} else {
			res.render('index.html', locals);
		}
		
	});
});

app.post('/tapi/counts', userutil.load_user_middleware, function(req, res){
	if(req.users.tsina) {
		tapi.counts({user: req.users.tsina, ids: req.body.ids}, function(data) {
			var counts = [];
			if(data) {
				counts = data;
			}
			res.send(JSON.stringify(counts));
		});
	} else {
		res.send('[]');
	}
});

app.get('/system_info', userutil.load_user_middleware, userutil.require_admin, function(req, res){
	tapi.rate_limit_status({user: config.tjob_user}, function(data) {
		data.user = config.tjob_user;
		if(data.reset_time) {
			data.reset_time = new Date(data.reset_time).format();
		}
		res.render('system.html', {rate_limit_statuses: [data]});
	});
});

// 设置文件上传
var upload_dir = config.filedir + '/upload';
utillib.mkdirs(upload_dir, '777', function(){
	app.post('/upload', uploadfile.upload(upload_dir));
	app.get('/down/:name', uploadfile.download(upload_dir, {field: 'name'}));
	// 查看简历
	app.get('/download', uploadfile.download(config.filedir, {field: 'p'}));
});

//app.get('/500', function(req, res){
//	throw new Error('keyboard cat!');
//});

job_handler.add(app);

app.listen(config.port);
console.log('web server start', config.base_url);

//catch all exception
process.on('uncaughtException', function (err) {
	var util = require('util');
	console.error('Uncaught exception: ' + err);
	console.error(err.message);
	console.error(err.stack);
});
