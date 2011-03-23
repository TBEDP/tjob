var path = require('path'),
	fs = require('fs');

// 创建所有目录
var mkdirs = module.exports.mkdirs = function(dirpath, mode, callback) {
	path.exists(dirpath, function(exists) {
		if(exists) {
			callback(dirpath);
		} else {
			//尝试创建父目录，然后再创建当前目录
			mkdirs(path.dirname(dirpath), mode, function(){
				fs.mkdir(dirpath, mode, callback);
			});
		}
	});
};

// 获取分页信息
module.exports.get_pagging = function(req, default_count) {
	default_count = default_count || 10;
	var offset = req.query.o || 0;
	try{
		offset = parseInt(offset);
		if(offset < 0) {
			offset = 0;
		}
	}catch(e){
		offset = 0;
	}
	var count = req.query.c || default_count;
	try{
		count = parseInt(count);
		if(count > 100 || count <= 0) { // 最大100
			count = default_count;
		}
	}catch(e){
		count = default_count;
	}
	var next_offset = offset + count;
	var prev_offset = offset - count;
	if(offset == 0) {
		prev_offset = null;
	} else {
		if(prev_offset < 0) {
			prev_offset = 0;
		}
	}
	return {
		offset: offset,
		count: count,
		next_offset: next_offset,
		prev_offset: prev_offset
	};
};

/*
 * 并发调用多个方法，当最后一个方法完成callback后，将调用finished_callback
 * 参数: ([function1, arg1, arg2, callback1], function2, ..., finished_callback)
 * waitfor([foo, hello, function(s){console.log(s)}], [bar, world, function(){}], function(){done.});
 */
var waitfor = module.exports.waitfor = function(){
	var wait_count = arguments.length - 1;
	var len = wait_count;
	var finished_callback = arguments[wait_count];
	var items = [];
	for(var i=0;i<len;i++) {
		items.push(arguments[i]);
	}
	items.forEach(function(args){
//		console.log(args)
		var f = args[0], params = args.slice(1, args.length - 1), cb = args[args.length - 1];
		params.push(function(){
			cb.apply(this, arguments);
			wait_count--;
			if(wait_count == 0) {
				finished_callback();
			}
		});
		f.apply(this, params);
	});
};

//function foo(a, b, cb) {
//	console.log('foo call', arguments);
//	cb(a + b);
//}
//
//function bar(s, cb) {
//	console.log('bar call', arguments);
//	cb(s + ' world');
//}
//
//waitfor([foo, 1, 2, function(result){
//	console.log('foo done', result);
//}], [bar, 'hello', function(result){
//	console.log('bar done', result);
//}], function(){
//	console.log('wait for done');
//});