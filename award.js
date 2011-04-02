/**
 * 抽奖相关逻辑
 * 
 * 转发大奖
抽奖规则与流程
每月对当月所有转发者进行一次抽奖，无论转发人数是多少，只要用户转发的是当月有效的任意招聘信息，不区分岗位，即符合抽奖条件。
抽奖规则如下:
1. 每位用户转发一次即可参与抽奖；
2. 当达到每月设定的时间，系统自动发起抽奖流程， 根据转发人数算出一个中奖hash值，再对每个转发用户算出用户hash值， 以一致性hash环的方式抽奖，中奖hash值的下一个最近的用户hash值就是中奖用户。
3. @淘job将自动通知中奖用户:
发送 @xxx 通过参与 #xxx# 有奖转发，成功在xx名转发者中抽中转发大奖。 详情请查看 http://t.cn/xxxxx
 * 
 */

//var hash = require('./lib/fnv').hash;
var hash = require('./public/js/util').md5;

/* 
 * 抽奖
 * 使用一致性hash环匹配算法实现, hash值使用fnv
 * 
 * @param {String|Number}lucky_number, 中奖号码
 * @param {Array}user_keys, 参与抽奖人的唯一标识
 * @return {Array} [中奖人的唯一标识, 中奖人的唯一标识hash，中奖号码hash]
 * @api public
 */
exports.lottery = function(lucky_number, user_keys){
	var lucky_hash = hash(String(lucky_number));
	var user_hashs = [];
	user_keys.forEach(function(user_key){
		user_hashs.push([user_key, hash(String(user_key) + lucky_hash + lucky_number)]);
	});
	// 先从小到大排序成环
	user_hashs.sort(function(a, b){
		if(a[1] <= b[1]) {
			return -1;
		} else {
			return 1;
		}
	});
	var lucky_user = null;
	for(var i=0; i<user_hashs.length; i++) {
		var user = user_hashs[i];
		if(lucky_hash <= user[1]) {
			// 中奖！
			lucky_user = user;
			break;
		}
	}
	if(lucky_user == null) {
		// 第一个人中奖
		lucky_user = user_hashs[0];
	}
	lucky_user.push(lucky_hash);
	return lucky_user;
};
