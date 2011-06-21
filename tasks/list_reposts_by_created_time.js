/**
 * 根据发表时间排序
 * 
 * mysql> select * from job_repost limit 1 \G;
*************************** 1. row ***************************
         id: 12188668710
  source_id: 12188579787
    user_id: tsina:2034126360
screen_name: tjobtest
 created_at: 2011-06-12 16:43:42
 weibo_info: {"created_at":"Sun Jun 12 16:38:12 +0800 2011","id":12188668710,"text":"推荐职位 #adwlsdfljl sdf slf w wwef sldfjs sdf sd#","source":"<a href=\"http://taojob.tbdata.org/\" rel=\"nofollow\">Taojob</a>","favorited":false,"truncated":false,"in_reply_to_status_id":"","in_reply_to_user_id":"","in_reply_to_screen_name":"","geo":null,"mid":"2111106122487656","user":{"id":2034126360,"screen_name":"tjobtest","name":"tjobtest","province":"33","city":"1","location":"浙江 杭州","description":"","url":"","profile_image_url":"http://tp1.sinaimg.cn/2034126360/50/0/1","domain":"","gender":"m","followers_count":1,"friends_count":1,"statuses_count":31,"favourites_count":0,"created_at":"Wed Mar 23 00:00:00 +0800 2011","following":false,"allow_all_act_msg":false,"geo_enabled":true,"verified":false,"t_url":"http://weibo.com/2034126360"},"retweeted_status":{"created_at":"Sun Jun 12 16:36:36 +0800 2011","id":12188579787,"text":"招聘#adwlsdfljl sdf slf w wwef sldfjs sdf sd#: slfjslfslflsf http://t.cn/aKtq20 http://t.cn/aKoVDg","source":"<a href=\"http://taojob.tbdata.org/\" rel=\"nofollow\">Taojob</a>","favorited":false,"truncated":false,"in_reply_to_status_id":"","in_reply_to_user_id":"","in_reply_to_screen_name":"","thumbnail_pic":"http://ww2.sinaimg.cn/thumbnail/6cecc358jw1di4bwj9ckfj.jpg","bmiddle_pic":"http://ww2.sinaimg.cn/bmiddle/6cecc358jw1di4bwj9ckfj.jpg","original_pic":"http://ww2.sinaimg.cn/large/6cecc358jw1di4bwj9ckfj.jpg","geo":null,"mid":"2111106122482687","user":{"id":1827455832,"screen_name":"卜电影","name":"卜电影","province":"44","city":"3","location":"广东 深圳","description":"这里都是精品电影，只推荐那些高评分的电影。播电影就卜电影","url":"http://bodianying.com","profile_image_url":"http://tp1.sinaimg.cn/1827455832/50/1285427251/0","domain":"bodianying","gender":"f","followers_count":64,"friends_count":1,"statuses_count":300,"favourites_count":0,"created_at":"Fri Sep 24 00:00:00 +0800 2010","following":false,"allow_all_act_msg":false,"geo_enabled":true,"verified":false,"t_url":"http://weibo.com/bodianying"},"t_url":"http://api.t.sina.com.cn/1827455832/statuses/12188579787"},"t_url":"http://api.t.sina.com.cn/2034126360/statuses/12188668710"}

 * 
 */

//格式化时间输出。示例：new Date().format("yyyy-MM-dd hh:mm:ss");
Date.prototype.format = function(format)
{
	format = format || "yyyy-MM-dd hh:mm:ss";
	var o = {
		"M+" : this.getMonth()+1, //month
		"d+" : this.getDate(),    //day
		"h+" : this.getHours(),   //hour
		"m+" : this.getMinutes(), //minute
		"s+" : this.getSeconds(), //second
		"q+" : Math.floor((this.getMonth()+3)/3), //quarter
		"S" : this.getMilliseconds() //millisecond
	};
	if(/(y+)/.test(format)) {
		format=format.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
	}

	for(var k in o) {
		if(new RegExp("("+ k +")").test(format)) {
			format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
		}
	}
	return format;
};

var db = require('../db.js')
  , fs = require('fs');
var mysql_db = db.mysql_db;
var source_id = process.argv[2];
var stream = fs.createWriteStream('../public/list_reposts/' + source_id + '.html', {flags: 'w', encoding: 'utf8'});
var end_time = new Date(process.argv[3]).getTime() / 1000;
stream.write('<!DOCTYPE html><head><title>参与转发抽奖的名单</title></head><body><style>table{border: 1px solid #C3C3C3;} td, th {border: 1px solid #C3C3C3;padding: 3px;vertical-align: top;} th {background-color: #E5EECC;}</style>');

mysql_db.query('select * from job_repost where source_id=' + source_id, function(err, rows) {
	if(err) {
		throw err;
	}
	var needs = [];
	for(var i = 0, len = rows.length; i < len; i++) {
		var row = rows[i];
		row.status = JSON.parse(row.weibo_info);
		row.status.created_at = new Date(row.status.created_at);
		row.weibo_time = row.status.created_at.getTime() / 1000;
		if(row.weibo_time < end_time) {
			needs.push(row);
		}
	}
	needs.sort(function(a, b) {
		return a.weibo_time - b.weibo_time;
	});
	stream.write('<table cellspacing="0" cellpadding="0" border="1" width="100%"><tr><th>楼层</th><th>转发者</th><th>转发时间</th><th>转发微博</th></tr>');
	for(var i = 0, len = needs.length; i < len; i++) {
		var row = needs[i];
		var link = 'http://api.t.sina.com.cn/' + row.status.user.id +  '/statuses/' + row.status.id;
		var line = '<tr><td>' + (i + 1) + '</td><td>@' + row.status.user.screen_name 
			+ '</td><td>' + row.status.created_at.format('yyyy-MM-dd hh:mm:ss') 
			+ '</td><td><a target="_blank" href="' + link + '">' + link + '</a></td></tr>\n';
		stream.write(line);
		console.log(line.substring(0, line.length - 1));
	}
	stream.write('</table></body></html>');
	mysql_db.end();
	stream.end();
});

