$(document).ready(function(){
	var pathname = window.location.pathname;
    $('#menu ul li a').each(function(){
        if($(this).attr('href') == pathname){
            $(this).parent().addClass('active');
            return false;
        }
    });
    
	// 处理转发统计
    var current_user_id = $('#current_user_id').val();
    if(current_user_id) {
        var ids = [];
        $('.title').each(function(){
            ids.push($(this).attr('id').substring(4));
        });
        if(ids.length > 0){
            $.post('/tapi/counts', {ids: ids.join(',')}, function(counts){
                $.each(counts, function(i, count){
                	var p = $('#job_' + count.id).parent();
                	p.find('.comment_count span').html(count.comments);
                	p.find('.repost_count span').html(count.rt);
                });
            }, 'json');
        }
    }
    
    // 获取热门职位
    $.getJSON('/job/hot', function(jobs){
    	var $hot_jobs = $('#hot_jobs');
    	$.each(jobs, function(i, job) {
    		$hot_jobs.append('<li><a href="/job/{{id}}">{{title}}</a></li>'.format(job));
    	});
    });
    
    // 我喜欢按钮
    $('.like_button').click(function(){
    	if(current_user_id) {
    		var $this = $(this);
    		var job_id = $this.attr('jobid');
    		var like_count = $this.find('span:last').text() || '0';
    		if($this.hasClass('unlike')) {
    			$.get('/job/unlike/' + job_id, function(data){
        			like_count = parseInt(like_count) - 1;
        			$this.find('span:last').html(like_count);
        			$this.removeClass('unlike');
        			$this.find('span:first').html('Like');
        		});
    		} else {
    			$.get('/job/like/' + job_id, function(data){
        			like_count = parseInt(like_count) + 1;
        			$this.find('span:last').html(like_count);
        			$this.addClass('unlike');
        			$this.find('span:first').html('Unlike');
        		});
    		}
    		
    	} else {
    		alert('请先登录.');
    	}
    });
});