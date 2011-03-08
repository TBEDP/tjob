// tjob web
var express = require('express'),
	tapi = require('node-weibo');
var app = express.createServer();
app.use(express.static(__dirname + '/public'));

// use jqtpl in express
app.set("view engine", "html");
app.register(".html", require("jqtpl"));

app.get('/', function(req, res){
	res.render('index.html', {layout: false, title: '工作达人'});
});

app.get('/login/:blogtype', function(req, res) {
	res.send('blogtype ' + req.params.blogtype);
});

app.listen(3000);