// 兼容客户端和服务器端的脚本

(function(exports){

var STRING_FORMAT_REGEX = 
	exports.STRING_FORMAT_REGEX = /\{\{([\w\s\.\(\)"',-\[\]]+)?\}\}/g;
String.prototype.format = function(values) {
    return this.replace(STRING_FORMAT_REGEX, function(match, key) {
        return values[key] || eval('(values.' +key+')');
    });
};

var URL_REGEX = exports.URL_REGEX = /https?:\/\/[^\s]+/;

String.prototype.urlsearch = function() {
	var m = URL_REGEX.exec(this);
	return m ? m[0] : null;
};

// let ie support forEach
if(typeof Array.prototype.forEach === 'undefined') {
	Array.prototype.forEach = function(callback){
		var len = this.length;
		for(var i=0; i<len; i++) {
			callback(this[i]);
		}
	};
}

var VideoService = exports.VideoService = {
	services: {
		youku: {
			url_re: /youku\.com\/v_show\/id_([^\.]+)\.html/i,
			tpl: '<embed src="http://player.youku.com/player.php/sid/{{id}}/v.swf" quality="high" width="460" height="400" align="middle" allowScriptAccess="sameDomain" type="application/x-shockwave-flash"></embed>'
		},
		ku6: {
			// http://v.ku6.com/special/show_3898167/rJ5BS7HWyEW4iHC3.html
			url_re: /ku6\.com\/.+?\/([^\.\/]+)\.html/i,
			tpl: '<embed src="http://player.ku6.com/refer/{{id}}/v.swf" quality="high" width="460" height="400" align="middle" allowScriptAccess="always" allowfullscreen="true" type="application/x-shockwave-flash"></embed>'
		},
		tudou: {
			url_re: /tudou\.com\/programs\/view\/([^\/]+)\/?/i,
			tpl: '<embed src="http://www.tudou.com/v/{{id}}/v.swf" type="application/x-shockwave-flash" allowscriptaccess="always" allowfullscreen="true" wmode="opaque" width="460" height="400"></embed>'
		},
		56: {
			url_re: /56\.com\/.+?\/(v_[^\.]+)\.html/i,
			tpl: '<embed src="http://player.56.com/{{id}}.swf" type="application/x-shockwave-flash" allowNetworking="all" allowScriptAccess="always" width="460" height="400"></embed>'
		},
		// http://video.sina.com.cn/playlist/4576702-1405053100-1.html#44164340 => 
		// http://you.video.sina.com.cn/api/sinawebApi/outplayrefer.php/vid=44164340_1405053100_1/s.swf
		// http://you.video.sina.com.cn/api/sinawebApi/outplayrefer.php/vid=44164340_1405053100_Z0LhTSVpCzbK+l1lHz2stqkP7KQNt6nkjWqxu1enJA5ZQ0/XM5GdZtwB5CrSANkEqDhAQJw+c/ol0x0/s.swf
		// http://you.video.sina.com.cn/b/32394075-1575345837.html =>
		// http://you.video.sina.com.cn/api/sinawebApi/outplayrefer.php/vid=32394075_1575345837/s.swf
//		sina: {
//			url_re: /video\.sina\.com\.cn\/.+?\/([^\.\/]+)\.html(#\d+)?/i,
//			format: function(matchs) {
//				var id = matchs[1];
//				if(matchs[2]) {
//					id = matchs[2].substring(1) + id.substring(id.indexOf('-'));
//				}
//				return id.replace('-', '_');
//			},
//			tpl: '<embed src="http://you.video.sina.com.cn/api/sinawebApi/outplayrefer.php/vid={{id}}/s.swf" type="application/x-shockwave-flash" allowNetworking="all" allowScriptAccess="always" width="460" height="400"></embed>'
//		},
		// http://www.youtube.com/v/A6vXOZbzBYY?fs=1
		// http://youtu.be/A6vXOZbzBYY
		// http://www.youtube.com/watch?v=x9S37QbWYJc&feature=player_embedded
		youtube: {
			url_re: /(?:(?:youtu\.be\/(\w+))|(?:youtube\.com\/watch\?v=(\w+)))/i,
			format: function(matchs, url, ele) {
				if(url.indexOf('youtube.com/das_captcha') >= 0) {
					matchs = this.url_re.exec($(ele).html());
				}
				var id = matchs[1] || matchs[2];
				return id;
			},
			tpl: '<embed src="http://www.youtube.com/v/{{id}}?fs=1" type="application/x-shockwave-flash" allowscriptaccess="always" allowfullscreen="true" width="460" height="400"></embed>'
		},
		
		// http://www.yinyuetai.com/video/96953
		yinyuetai: {
			url_re: /yinyuetai\.com\/video\/(\w+)/i,
			tpl: '<embed src="http://www.yinyuetai.com/video/player/{{id}}/v_0.swf" quality="high" width="460" height="400" align="middle"  allowScriptAccess="sameDomain" type="application/x-shockwave-flash"></embed>'
		},
		
		// http://www.xiami.com/song/2112011
		// http://www.xiami.com/widget/1_2112011/singlePlayer.swf
		xiami: {
			append: true, // 直接添加在链接后面
			url_re: /xiami\.com\/song\/(\d+)/i,
			tpl: '<embed src="http://www.xiami.com/widget/1_{{id}}/singlePlayer.swf" type="application/x-shockwave-flash" width="257" height="33" wmode="transparent"></embed>'
		},
		
		// http://v.zol.com.cn/video105481.html
		zol: {
			url_re: /v\.zol\.com\.cn\/video(\w+)\.html/i,
			tpl: '<embed height="400" width="460" wmode="opaque" allowfullscreen="false" allowscriptaccess="always" menu="false" swliveconnect="true" quality="high" bgcolor="#000000" src="http://v.zol.com.cn/meat_vplayer323.swf?movieId={{id}}&open_window=0&auto_start=1&show_ffbutton=1&skin=http://v.zol.com.cn/skin_black.swf" type="application/x-shockwave-flash">'
		},
		// http://v.ifeng.com/his/201012/00b4cb1a-7838-4846-aeaf-9967e3cdcd99.shtml
		// http://v.ifeng.com/v/jiashumei/index.shtml#bcd47338-3558-4436-90ca-4e233fcbc37a
		ifeng: {
			url_re: /v\.ifeng\.com\/(.+?)\/([^\.\/]+)\./i,
			format: function(matchs, url, ele) {
				var re = /[A-F0-9]{8}(?:-[A-F0-9]{4}){3}-[A-Z0-9]{12}/i;
				var m = re.exec(url);
				if(m) {
					matchs = m;
				}
				return matchs[matchs.length - 1];
			},
			tpl: '<embed src="http://v.ifeng.com/include/exterior.swf?guid={{id}}&pageurl=http://www.ifeng.com&fromweb=other&AutoPlay=true" quality="high"  allowScriptAccess="always" pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" width="460" height="400"></embed>'
		}
	},
	attempt: function(url) {
		var html = null;
		for(var name in this.services) {
			var service = this.services[name];
			if(service.url_re.test(url)) {
				html = this.format_tpl(service, url);
				break;
			}
		}
		return html;
	},
	format_tpl: function(service, url, ele) {
		var matchs = service.url_re.exec(url);
		var id = null;
		if(service.format) {
			id = service.format(matchs, url, ele);
		} else {
			id = matchs[1];
		}
		return service.tpl.format({id: id});
	}
};

var get_dict_length = exports.get_dict_length = function(dict){
	if(Object.keys) {
		return Object.keys(dict).length;
	} else {
		var len = 0;
		for(k in dict) {
			len++;
		}
		return len;
	}
};

//获取分页信息
exports.get_pagging = function(req, default_count) {
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
 * 
 * demo:
 * 
 *  function foo(a, b, cb) {
		console.log('foo call', arguments);
		cb(a + b);
	}
	
	function bar(s, cb) {
		console.log('bar call', arguments);
		cb(s + ' world');
	}
	
	waitfor([foo, 1, 2, function(result){
		console.log('foo done', result);
	}], [bar, 'hello', function(result){
		console.log('bar done', result);
	}], function(){
		console.log('wait for done');
	});
 * 
 */
exports.waitfor = function(){
	var wait_count = arguments.length - 1;
	var len = wait_count;
	var finished_callback = arguments[wait_count];
	var items = [];
	for(var i=0;i<len;i++) {
		items.push(arguments[i]);
	}
	items.forEach(function(args){
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


//server only
if(typeof require !== 'undefined') {
	var path = require('path'),
	fs = require('fs');

	//创建所有目录
	var mkdirs = exports.mkdirs = function(dirpath, mode, callback) {
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
}

})( (function(){
	if(typeof exports === 'undefined') {
		window.util = {};
		return window.util;
	} else {
		return exports;
	}
})() );