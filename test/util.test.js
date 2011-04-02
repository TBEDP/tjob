
/**
 * Module dependencies.
 */

var assert = require('assert'),
	utillib = require('util.js');

module.exports = {
    'md5(s)': function(){
        assert.equal('a683090976ec0f04dca81f6db9ca7484', utillib.md5('mk2'));
        assert.equal('d41d8cd98f00b204e9800998ecf8427e', utillib.md5(''));
    },
    
    'string.format': function(){
    	assert.isDefined(String.prototype.format);
    	assert.equal('hello world, 哈哈 OK', 
    		'hello {{w}}, {{0}} {{1}}'.format({w: 'world', 0: '哈哈', '1': 'OK'}));
    	assert.equal('哈哈 OK', '{{0}} {{1}}'.format(['哈哈', 'OK']));
    },
    
    'string.trim': function(){
    	assert.isDefined(String.prototype.trim);
    	assert.equal('', '      \t \r \n      '.trim());
    	assert.equal('a  \tb \r \n c', '  \t  a  \tb \r \n c   \n  '.trim());
    	assert.equal('a  \tb \r \n c', '  \t  a  \tb \r \n c'.trim());
    	assert.equal('a  \tb \r \n c', 'a  \tb \r \n c   \n  '.trim());
    },
    
    'Array.forEach': function(){
    	assert.isDefined(Array.prototype.forEach);
    },
    
    'log method': function(){
    	assert.isDefined(utillib.log);
    	assert.isDefined(utillib.error);
    },
    
    'is_filetype': function(){
    	var types = ['doc,txt,pdf', 'doc   ,   txt , pdf', ['doc ', 'txt', 'pdf']];
    	var false_strings = ['', 'abc', 'abc.docx', 'aefwe/abc.exe', '....exe',
    	    'exe', '/.exe', '\\.exe', 
    	    // 空白符号
    	    '  ', ' | ', ' \n\t\r   ', ' | .pdf', '|.pdf', ' \' ',
    	    ' .txt', '    .txt', ' d \n   .pdf', ' \n   .pdf', ' \n\t\r   .pdf',
    	    '\t\n   .pdf', '.doc', '/abc/wd/sdf/.doc', '\\abc\\wd\\sdf\\.doc'
    	];
    	var true_strings = ['ab    .txt', '哈哈 .txt', 'abc.doc', '/abc/wd/sdf/l.doc',
    	    ' d \n d  .pdf',
    	    'abc.txt', '哈哈.txt', '哈哈.pdf', 'a/d/w/哈哈.pdf'];
    	for(var j=0; j<types.length; j++){
    		for(var i=0; i<false_strings.length; i++) {
        		assert.eql(false, utillib.is_filetype(false_strings[i], types[j]),
        				false_strings[i]);
        	}
    		
    		for(var i=0; i<true_strings.length; i++) {
        		assert.eql(true, utillib.is_filetype(true_strings[i], types[j]),
        				true_strings[i]);
        	}
    	}
    },
    
    'get_dict_length': function() {
    	assert.isDefined(utillib.get_dict_length);
    },
    
    'mkdirs': function(beforeExit) {
    	var path = require('path'),
    		fs = require('fs');
    	var done = 0;
    	var dirs = ['/tmp/mkdirs_test/f1', '/tmp/mkdirs_test/d/f/w/s/d/a/d'];
    	dirs.forEach(function(dirpath){
    		utillib.mkdirs(dirpath, '766', function(){
        		path.exists(dirpath, function(exists) {
        			assert.eql(true, exists);
        			done ++;
    			});
        	});
    	});
    	beforeExit(function(){
    		assert.eql(dirs.length, done);
    		var exec = require('child_process').exec;
    		exec('rm -rf /tmp/mkdirs_test', function(error, stdout, stderr) {
    			assert.isNull(error);
    			assert.isNull(stdout);
    			assert.isNull(stderr);
    		});
    	});
    }
};