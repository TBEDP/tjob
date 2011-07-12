var os = require('os'),
	path = require('path');
var weibo = require('weibo');

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
	 id: 1927866610,
	 screen_name: 'tjobtest',
	 name: 'tjobtest',
	 province: '33',
	 city: '1',
	 location: '浙江 杭州',
	 description: '',
	 url: '',
	 profile_image_url: 'http://tp3.sinaimg.cn/1927866610/50/1296197686/1',
	 domain: 'tbrd',
	 gender: 'm',
	 followers_count: 240,
	 friends_count: 47,
	 statuses_count: 3,
	 favourites_count: 0,
	 created_at: 'Fri Jan 28 00:00:00 +0800 2011',
	 following: false,
	 allow_all_act_msg: true,
	 geo_enabled: true,
	 t_url: 'http://weibo.com/tbrd',
	 blogtype: 'tsina',
	 oauth_token_key: "74f67950a44654f9fba4f7d471611605",
	 oauth_token_secret: "29b39ff41e7fab8077474349e210cf22",
	 authtype: 'oauth',
	 user_id: 'tsina:1927866610' 
};

var host = 'taojob.tbdata.org';
if(debug) {
	// 请修改host文件
	host = 'taojobtest.tbdata.org:9999';
}
exports.base_url = 'http://' + host;

exports.filedir = path.join(__dirname, 'files');
