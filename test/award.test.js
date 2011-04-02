
var assert = require('assert'),
	award = require('../award');

module.exports = {
	'lottery': function(){
//		var mysql_db = require('../db').mysql_db;
////		var users = ['Python发烧友', '玄了个澄的', '此处空无一人', 'FaWave', 'Facebook那点事儿', 'c', 'd'];
//		mysql_db.query('select distinct(screen_name) from job_repost', function(err, rows){
//			var users = [];
//			rows.forEach(function(row){
//				users.push(row.screen_name);
//			});
//			var hits = {};
//			for(var i=0; i<100; i++) {
//				var lucky_number = new Date().getTime() + i;
//				var lucky_user = award.lottery(lucky_number, users);
//				var hit = hits[lucky_user[0]] || 0;
//				hit ++;
//				hits[lucky_user[0]] = hit;
//			}
//			var sort_hits = [];
//			for(var k in hits) {
//				sort_hits.push([k, hits[k]]);
//			}
//			sort_hits.sort(function(a, b) {
//				if(a[1] < b[1]) {
//					return -1;
//				} else if(a[1] == b[1]){
//					return 0;
//				}
//				return 1;
//			});
//			sort_hits.forEach(function(hit){
//				console.log(hit[1], hit[0]);
//			});
//		});
	}
};