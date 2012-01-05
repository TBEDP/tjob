// tjob web

var express = require('express');
var jqtpl = require("jqtpl");
var path = require('path');
var fs = require('fs');
var config = require('./config.js');
var weibo = require('weibo');
var utillib = require('./public/js/util.js');
var uploadfile = require('./lib/uploadfile');
var RedisStore = require('connect-redis')(express);
var user = require('./routes/user');

var static_options = { maxAge: 3600000 * 24 * 30 };
var MAX_AGE = 3600 * 24 * 14;
var app = express.createServer(
  express.bodyParser({ uploadDir: config.FILE_DIR, keepExtensions: true }), 
  express.static(__dirname + '/public', static_options), 
  express.cookieParser(), 
  express.session({ 
    secret: config.session.secret, 
    store: new RedisStore({host: config.session.host})
  }), 
  user.oauth_handle,
  express.errorHandler({ dumpExceptions: true, showStack: true })
);

var logger_options = {
  format: ':http-version|:method|:url|:status|:response-time|:remote-addr|:referrer|:date|:user-agent'
};
if (!config.debug) {
    //日志格式
  var log_path = path.join(__dirname, 'web.log');
  console.log('log file:', log_path);
  var log_write_stream = fs.createWriteStream(log_path, { flags: 'a' });
  process.on('exit', function() {
    console.log('process exit, log end()');
    log_write_stream.end();
  });
  logger_options.stream = log_write_stream;
}

// use jqtpl in express
app.set("view engine", "html");
app.set("jsonp callback", "callback");
app.register(".html", jqtpl.express);
app.set('view options', {
	layout: 'layout.html'
});

app.helpers({
  config: config
});

user(app); // must first
require('./routes/job')(app);
require('./routes/resume')(app);
require('./routes/tag')(app);
require('./routes/site')(app);

// 设置文件上传
var upload_dir = config.FILE_DIR + '/upload';
utillib.mkdirs(upload_dir, '777', function(){
  app.post('/upload', uploadfile.upload(upload_dir));
  app.get('/down/:name', uploadfile.download(upload_dir, {field: 'name'}));
  // 查看简历
  app.get('/download', uploadfile.download(config.FILE_DIR, {field: 'p'}));
});

app.listen(config.site.port);
console.log(new Date() + ' web server start at ' + config.site.homeurl);

//catch all exception
process.on('uncaughtException', function (err) {
  console.error('Uncaught exception: ' + err);
  console.error(err.message);
  console.error(err.stack);
  process.exit();
});
