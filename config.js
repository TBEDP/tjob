var os = require('os'),
	path = require('path');
var weibo = require('weibo');

// set weibo appkey
weibo.init('tsina', '4010445928', 'd119f62bfb70a4ba8d9b68bf14d6e45a');
exports.tapi = weibo.tapi;

var debug = exports.debug = true;
exports.port = 9999;
exports.session_secret = 'I\'m a seesion secret. Please change me in production env.';
exports.session_host = '127.0.0.1';
var db_options = module.exports.db_options = {
	host: 'localhost',
	port: 3306,
	user: 'root',
	password: '123456',
	database: 'tjob'
};

exports.tjob_user = { 
    id: 2034126360,
    screen_name: 'tjobtest',
    name: 'tjobtest',
    province: '33',
    city: '1',
    location: '浙江 杭州',
    description: '',
    url: '',
    profile_image_url: 'http://tp1.sinaimg.cn/2034126360/50/0/1',
    domain: '',
    gender: 'm',
    followers_count: 1,
    friends_count: 1,
    statuses_count: 34,
    favourites_count: 0,
    created_at: 'Wed Mar 23 00:00:00 +0800 2011',
    following: false,
    allow_all_act_msg: false,
    geo_enabled: true,
    verified: false,
    t_url: 'http://weibo.com/2034126360',
    blogtype: 'tsina',
    oauth_token_key: '25c0dbf4fc42f5e1a309e3f796c558f5',
    oauth_verifier: '428085',
    oauth_token_secret: '19b7a8ba9437858fd04d08d7226fb265',
    authtype: 'oauth',
    user_id: 'tsina:2034126360' 
};

var host = 'taojob.tbdata.org';
if(debug) {
	// 请修改host文件
	host = 'taojobtest.tbdata.org:9999';
}
exports.base_url = 'http://' + host;

exports.filedir = path.join(__dirname, 'files');