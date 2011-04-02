
/**
 * FNV hash: http://isthe.com/chongo/tech/comp/fnv/
 * source code from: 
 * http://code.google.com/p/renderengine/source/browse/trunk/engine/engine.fnv1hash.js?spec=svn674&r=674
 */

(function(exports){

/**
 * @class Implementation of FNV1a - a fast hash function. The FNV1a variant
 *        provides a slightly better dispersion for short (< 4 bytes) values
 *        than plain FNV1.
 * 
 * <p>
 * This implementation uses 32-bit operations, and the values returned from
 * {@link #getHash()} are limited to the lower 32 bits.
 * </p>
 * 
 * @author Andrzej Bialecki &lt;ab@getopt.org&gt;
 */
var FNV1a32 = {
	INIT: 0x811c9dc5,
	
	// Convert a string to an array of bytes
	getBytes: function(s) {
		var buf = [];
		for (var i = 0; i < s.length; i++) {
			buf.push(s.charCodeAt(i));
	    }
	    return buf;
	},
		   
	fnv: function(buf, offset, len, seed) {
		for ( var i = offset; i < offset + len; i++) {
			seed ^= buf[i];
			seed += (seed << 1) + (seed << 4) + (seed << 7) + (seed << 8)
					+ (seed << 24);
		}
		return seed;
	},

	getHash: function(buf) {
		if(typeof buf === "string") {
            buf = this.getBytes(buf);
            offset = 0;
            len = buf.length;
        }
        hash = this.fnv(buf, offset, len, this.INIT);
		return Number(hash & 0xffffffff).toString(16);
	}
};

exports.hash = function(str) {
	return FNV1a32.getHash(str);
};

})( (function(){
	if(typeof exports === 'undefined') {
		window.fnv = {};
		return window.fnv;
	} else {
		return exports;
	}
})() );