/**
 * 图片生成模块
 * @author mk2
 */

/**
 * @type Object
 */
var IMAGE_TYPES = {
		
};

/**
 * Create an image with text.
 * When operation done will call `fn` with (err, path).
 * Image create success err should be null, otherwise err will be set.
 * 
 * @param {String|Buffer} text
 * @param {String|Buffer} path
 * @param {Function} fn
 * @api public
 */
var create_text_image = function(text, path, fn) {
	var err = null;
	fn(err, path);
};

