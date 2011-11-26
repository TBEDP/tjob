var os = require('os');
var fs = require('fs');
var path = require('path');
var weibo = require('weibo');
var conf = module.exports = JSON.parse(fs.readFileSync('./config.json'));

/**
 * setting weibo appkey
 */
for(var blogtype in conf.weibo) {
  var info = conf.weibo[blogtype];
  weibo.init(blogtype, info.app_key, info.app_secret);
}

conf.tapi = weibo.tapi;

conf.FILE_DIR = path.join(__dirname, 'files');

var homeurl = 'http://' + conf.site.host;
if(conf.site.port !== 80) {
  homeurl += ':' + conf.site.port;
}
conf.site.homeurl = homeurl;