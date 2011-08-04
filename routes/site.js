
/**
 * Module dependencies.
 */

var Job = require('../models/job')
  , config = require('../config')
  , tapi = config.tapi
  , userauth = require('./user')
  , util = require('../public/js/util');

module.exports = function(app){
    app.get('/', function(req, res){
        var pagging = util.get_pagging(req);
        Job.query('where status=0 order by id desc limit ?, ?', [pagging.offset, pagging.count], function(err, rows) {
            var locals = {
                jobs: rows,
                page_count: pagging.count,
                prev_offset: pagging.prev_offset
            };
            if(rows.length == pagging.count) {
                locals.next_offset = pagging.next_offset;
            }
            var user = req.session.current_user;
            if(user && rows.length > 0) {
                // 判断当前用户是否喜欢
                var job_ids = [];
                for(var i = 0, len = rows.length; i < len; i++) {
                    job_ids.push(rows[i].id);
                }
                Job.check_likes(user.user_id, job_ids, function(err, likes){
                    rows.forEach(function(row) {
                        row.user_like = likes[row.id];
                    });
                    res.render('index.html', locals);
                });
            } else {
                res.render('index.html', locals);
            }
        });
    });
    
    app.post('/tapi/counts', function(req, res){
        if(req.session.user) {
            // 已登录到用户，调用新浪api获取最新到数据
            tapi.counts({user: req.session.user, ids: req.body.ids}, function(error, data) {
                var counts = [];
                if(data) {
                    counts = data;
                }
                if(error) {
                    console.error(error);
                }
                res.send(JSON.stringify(counts));
            });
        } else {
            res.send('[]');
        }
    });

    app.get('/system_info', userauth.require_admin, function(req, res) {
        tapi.rate_limit_status({user: config.tjob_user}, function(err, data) {
            if(err) {
                return res.send(JSON.stringify(err));
            }
            data.user = config.tjob_user;
            if(data.reset_time) {
                data.reset_time = new Date(data.reset_time).format();
            }
            res.render('system.html', {rate_limit_statuses: [data]});
        });
    });
};