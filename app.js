// tjob web

var express = require('express'),
	path = require('path'),
	fs = require('fs'),
	form = require('connect-form'),
	config = require('./config.js'),
	tapi = config.tapi,
	utillib = require('./public/js/util.js'),
	uploadfile = require('./lib/uploadfile'),
	nStoreSession = require('./lib/nstore-session');

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

var static_options = {maxAge: 3600000 * 24 * 30};
var MAX_AGE = 3600 * 24 * 14;
var app = express.createServer(
    form({ uploadDir: config.filedir, keepExtensions: true })
  , function(req, res, next) {
        if(req.form) {
            req.form.complete(function(err, fields, files){
                req.body = {};
                if(!err) {
                    req.form.fields = fields;
                    req.form.files = files;
                    req.body = fields;
                }
                next(err);
            });
        } else {
            return next();
        }
    }
  , express.static(__dirname + '/public', static_options)
  , express.cookieParser()
  , express.bodyParser()
  , express.session({ 
      secret: config.session_secret
    , store: new nStoreSession({maxAge: MAX_AGE, dbFile: __dirname + "/sessions.db"})
  })
//  , express.csrf()
  , express.errorHandler({ dumpExceptions: true })
);

var logger_options = {
	format: ':http-version|:method|:url|:status|:response-time|:remote-addr|:referrer|:date|:user-agent'
};
if(!config.debug) {
    //日志格式
    var log_path = path.join(__dirname, 'web.log');
    console.log('log file:', log_path);
    var log_write_stream = fs.createWriteStream(log_path, {flags: 'a'});
    process.on('exit', function(){
        console.log('process exit, log end()');
        log_write_stream.end();
    });
    logger_options.stream = log_write_stream;
}
app.use(express.logger(logger_options));

// use jqtpl in express
app.set("view engine", "html");
app.register(".html", require("jqtpl").express);
app.set('view options', {
	layout: 'layout.html'
});

require('./routes/user')(app); // must first
require('./routes/job')(app);
require('./routes/resume')(app);
require('./routes/site')(app);

// 设置文件上传
var upload_dir = config.filedir + '/upload';
utillib.mkdirs(upload_dir, '777', function(){
	app.post('/upload', uploadfile.upload(upload_dir));
	app.get('/down/:name', uploadfile.download(upload_dir, {field: 'name'}));
	// 查看简历
	app.get('/download', uploadfile.download(config.filedir, {field: 'p'}));
});

app.listen(config.port, '127.0.0.1');
console.log('web server start', config.base_url);

//catch all exception
process.on('uncaughtException', function (err) {
	console.error('Uncaught exception: ' + err);
	console.error(err.message);
	console.error(err.stack);
});
