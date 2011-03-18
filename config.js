var os = require('os'),
	dns = require('dns');

var port = module.exports.port = 3000;
var db_options = module.exports.db_options = {
	host: 'localhost',
	port: 3306,
	user: 'root',
	password: '123456',
	database: 'tjob'
};
dns.lookup(os.hostname(), function(err, address, family){
	module.exports.ip = address;
	module.exports.base_url = 'http://' + address + ':' + port;
	//console.log('dns get ip', address);
});

var tjob_user = module.exports.tjob_user = {
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