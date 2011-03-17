// tjob web
var utillib = require('./util.js');
var express = require('express'),
	form = require('connect-form'),
	tapi = require('node-weibo'),
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

job.add(app);

app.listen(config.port);
console.log('web server start', config.base_url);