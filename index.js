// tjob web
// fixed node module paths problem;
require.paths.push('/usr/lib/node/');

var express = require('express'),
	path = require('path'),
	fs = require('fs'),
	form = require('connect-form'),
	tapi = require('node-weibo'),
	utillib = require('./util.js');
	user = require('./user.js'),
	config = require('./config.js'),
	job = require('./job.js');

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

var mysql_db = require('./db.js').mysql_db;


var app = express.createServer(
	form({ keepExtensions: true })
);

app.base_url = config.base_url;

app.mysql_db = mysql_db;

app.use(express.static(__dirname + '/public'));
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
user.auth(app);

app.load_user_middleware = user.load_user_middleware(app);

app.get('/', app.load_user_middleware, function(req, res){
	var pagging = utillib.get_pagging(req);
	job.get_jobs(app, 'where status=0 order by id desc limit ?, ?', [pagging.offset, pagging.count], function(rows) {
		var locals = {
			jobs: rows,
			page_count: pagging.count,
			prev_offset: pagging.prev_offset
		};
		if(rows.length == pagging.count) {
			locals.next_offset = pagging.next_offset;
		}
		res.render('index.html', locals);
	});
});

app.post('/tapi/counts', app.load_user_middleware, function(req, res){
	if(req.users.tsina) {
		tapi.counts({user: req.users.tsina, ids: req.body.ids}, function(data) {
			var counts = [];
			if(!data.error) {
				counts = data;
			}
			res.send(JSON.stringify(counts));
		});
	} else {
		res.send('[]');
	}
});

app.get('/system_info', app.load_user_middleware, user.require_admin, function(req, res){
	tapi.rate_limit_status({user: config.tjob_user}, function(data) {
		data.user = config.tjob_user;
		if(data.reset_time) {
			data.reset_time = new Date(data.reset_time).format();
		}
		res.render('system.html', {rate_limit_statuses: [data]});
	});
});

//app.get('/500', function(req, res){
//	throw new Error('keyboard cat!');
//});

job.add(app);

app.listen(config.port);
console.log('web server start', config.base_url);

//catch all exception
process.on('uncaughtException', function (err) {
	var util = require('util');
	console.error('Uncaught exception: ' + err);
	console.error(err.message);
	console.error(err.stack);
});