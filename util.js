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