
/**
 * Upload file handler for jQuery-File-Upload(https://github.com/blueimp/jQuery-File-Upload)
 * 
 * http response:
 * {"name":"picture.jpg","type":"image/jpeg","size":"123456789"}
 * 
 * ## Module dependencies:
 * 
 * 1. express
 * 
 * ## How to use:
 * 
 * ### Handle file upload
 * 
 *     var upload = require('uploadfile').upload;
 *     app.post('/upload', upload(__dirname + '/files'));
 * 
 * ### Handle file download
 * 
 *     var download = require('uploadfile').download;
 *     // use default field `name` in req.params
 *     app.get('/download/:name', download(__dirname + '/files'));
 *     
 *     // or set the field name 
 *     // if the downurl like `http://localhost:3000/download?p=abc.jpg`
 *     // download handler use `p` field to get the filename in req.query, just req.query.p
 *     app.get('/download', download(__dirname + '/files', {field: 'p'}));
 * 	
 */ 

/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , mime = require('mime');

var _save_file = function(options, file, callback) {
	var result = {name: file.name, type: file.type, size: file.size};
	var save_path = path.join(options.root, file.name);
	fs.rename(file.path, save_path, function(err) {
		console.error(err);
		if(err) {
			result.error = err.message;
		}
		callback(result);
	});
};

var _upload = function(req, res, next, options) {
	var files = req.files;
	var file_count = Object.keys(files).length;
    if(file_count > 0) {
        var results = [];
        for(var k in files) {
            _save_file(options, files[k], function(result){
                results.push(result);
                if(results.length == file_count){
                    if(file_count == 1){
                        results = results[0];
                    }
                    res.send(JSON.stringify(results));
                }
            });
        }
    } else {
        res.send(JSON.stringify({error: 'no file'}));
    }
};

var _download = function(req, res, next, options) {
	var filename = req.params[options.field] || req.query[options.field];
	if(!filename) {
		next();
	} else {
		var filepath = path.join(options.root, filename);
		path.exists(filepath, function(exists){
			if(!exists) {
				next();
			} else {
				var type = mime.lookup(filename);
				if(!options.attachment_image && type.indexOf('image/') >= 0) {
					res.sendfile(filepath);
				} else if(!options.attachment_plain_text && type == 'text/plain') {
					res.sendfile(filepath);
				} else {
					res.download(filepath, encodeURI(path.basename(filename)));
				}
			}
		});
	}
};

/**
 * handle file upload
 * 
 * @param {String} root, which folder to save file, make sure root exists.
 * @options {Object} options
 * @api public
 */
exports.upload = function upload(root, options){
	options = options || {};

	// root required
	if (!root) throw new Error('upload() root path required');
	options.root = root;

	return function(req, res, next) {
		_upload(req, res, next, options);
	};
};

/**
 * handle file download
 *
 * @param {String} root, which folder to save file, make sure root exists.
 * @param {Object} options: 
 * 	field: field name to get the download file name in request obj. default is `name`;
 *  attachment_image: if set true, will download image as attachment. default is false;
 *  attachment_plain_text: if set true, will download `text/plain` as attachment. default is false;
 * 
 * @api public
 */
exports.download = function download(root, options) {
	options = options || {};
	options.field = options.field || 'name';
	options.attachment_image = !!options.attachment_image;
	// text/plain
	options.attachment_plain_text = !!options.attachment_plain_text;
	// root required
	if (!root) throw new Error('download() root path required');
	options.root = root;

	return function(req, res, next) {
		_download(req, res, next, options);
	};
};