// tjob web
var express = require('express'),
	tapi = require('node-weibo'),
	user = require('./user.js'),
	form = require('connect-form'),
	job = require('./job.js');
var mysql_db = new require('mysql').Client();
mysql_db.user = 'root';
mysql_db.password = '123456';
mysql_db.connect();
mysql_db.query('USE tjob');

var app = express.createServer(
	form({ keepExtensions: true })
);
var base_url = 'http://localhost:3000';
app.base_url = base_url;

app.mysql_db = mysql_db;

app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.bodyParser());

// use jqtpl in express
app.set("view engine", "html");
app.register(".html", require("jqtpl"));

// 用户认证
user.auth(app);

app.load_user_middleware = user.load_user_middleware(app);

app.get('/', app.load_user_middleware, function(req, res){
	job.get_jobs(app, 'order by id desc limit 10', null, function(rows) {
		res.render('index.html', {
			layout: false, 
			title: '工作达人', 
			users: req.users,
			jobs: rows
		});
	});
});

job.add(app);

app.listen(3000);