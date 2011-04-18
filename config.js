var os = require('os'),
	path = require('path');
var weibo = require('node-weibo');

// set weibo appkey
weibo.init('tsina', '4010445928', 'd119f62bfb70a4ba8d9b68bf14d6e45a');
exports.tapi = weibo.tapi;

var debug = true;
exports.port = 9999;
var db_options = module.exports.db_options = {
	host: 'localhost',
	port: 3306,
	user: 'root',
	password: '123456',
	database: 'tjob'
};

exports.tjob_user = {
	"id":"1989184342",
	"screen_name":"淘job","name":"淘job",
	"province":"33", "city":"1",
	"location":"浙江 杭州","description":"",
	"profile_image_url":"http://tp3.sinaimg.cn/1989184342/50/0/1",
	"domain":"tjob",
	"gender":"m","followers_count":0,"friends_count":0,"statuses_count":0,"favourites_count":0,
	"created_at":"Thu Mar 10 00:00:00 +0800 2011",
	"t_url":"http://t.sina.com.cn/tjob",
	"blogtype":"tsina",
	"oauth_token_key":"32f67c5abe8eabf849893c01c8d129b8","oauth_verifier":"643004",
	"oauth_token_secret":"5e82211e73a21f4793c7c924468e7ca5",
	"authtype":"oauth",
	"user_id":"tsina:1989184342"
};

var host = 'taojob.tbdata.org';
if(debug) {
	// 请修改host文件
	host = 'taojobtest.tbdata.org';
	exports.tjob_user = {
		'screen_name': 'tjobtest',
		'username': 'tjobtest@sina.cn',
		'blogtype': 'tsina',
		'password': '123456'
	};
}
exports.base_url = 'http://' + host;

exports.filedir = path.join(__dirname, 'files');
