(function(exports){
	
exports.RESUME_FILETYPES = 'doc,docx,pdf,txt,wps,odf,md,png,gif,jpg';

})( (function(){
	if(typeof exports === 'undefined') {
		window.constant = {};
		return window.constant;
	} else {
		return exports;
	}
})() );