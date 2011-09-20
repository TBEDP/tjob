var mongo = require('mongoskin');

exports.port = 8080;
exports.email='free_swallow8938@qq.com';
exports.site_name = 'Visual Resume';
exports.site_desc = '';
exports.session_secret = 'wniosmfxoewlefjzsandywong';

exports.db = mongo.db('localhost:27017/test');
