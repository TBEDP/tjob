// 详细页面逻辑
$(document).ready(function(){
    $('#update_resume_btn').click(function(){
        $('#introducer').val($('#resume_introducer').text().substring(1));
        $('#upload_resume_form').show();
        $('#upload_btn').val('更新简历');
        $(this).hide();
    });
    
    // 检测是否可以提交数据
    // 只要有一项有数据，就可以提交
    var _check_can_submit = function() {
    	var can_submit = false;
    	var resume_filename = $('#resume').val();
    	if($('#comment').val()|| resume_filename || $('#answer').val() ) {
    		can_submit = true;
    	}
    	if(resume_filename) {
    		if(!util.is_filetype(resume_filename, constant.RESUME_FILETYPES)){
    			can_submit = false;
    			$('#resume').val('');
    			alert('只允许上传: ' + constant.RESUME_FILETYPES);
    		}
    	}
    	if($('#answer').length == 1 && !$('#answer').val()) {
    		can_submit = false;
    	}
    	can_submit ? $('#upload_btn').attr('disabled', false) 
        	: $('#upload_btn').attr('disabled', true);
    };
    $('#resume').change(_check_can_submit);
    // 需要回答问题
    if($('#answer, #comment').length > 0) {
    	$('textarea.simple_tinymce').tinymce($.extend({}, editor_options, {
        	theme: 'simple',
        	height: '200',
        	onchange_callback: _check_can_submit
        }));
    }
    
//    $('#upload_btn').click(function(){
//    	if(!$('#resume').val()) {
//    		$('#resume').attr('disabled', 'disabled');
//    	}
//    });
    
    $('.close_job_btn').click(function(){
        if(confirm('确定要结束此招聘信息？')){
            var jobid = $(this).attr('jobid');
            $(this).attr('disabled', true);
            $.post('/job/' + jobid, {status:1}, function(result){
                window.location = window.location;
            });
        }
    });
    var current_user_id = $('#current_user_id').val();
	var job_id = $('#job_id').val(), weibo_id = $('#job_weibo_id').val();
    // 获取转发人列表
    $.getJSON('/job/' + job_id + '/repost_users/' + weibo_id, function(data){
    	var users = data.users;
    	if(users.length > 0) {
    		$('#repost_users').append('<h2>转发者</h2>');
    		for(var i=0; i<users.length; i++){
    			var screen_name = users[i];
            	var item = {
            		screen_name: screen_name,
            		screen_name_encode: encodeURI(screen_name)
            	};
                $('#repost_users').append('<a class="repost_user" target="_blank" href="http://t.sina.com.cn/n/{{screen_name_encode}}">@{{screen_name}}</a>&nbsp;&nbsp;'.format(item));;
            }
		}
    	if(current_user_id) {
	        var $introducer_selector = $('#introducer_selector');
	        var author = $('#author_link').text().substring(1);
	        var default_introducer = $('#resume_introducer').text().substring(1) 
	        	|| data.introducer || author;
	        $('#introducer').val(default_introducer);
    	}
    });
    
    $("#introducer").autocomplete("/user/friends/search", {
		width: 260,
		selectFirst: true
	});
    $("#introducer").keypress(function(event){
    	if(event.keyCode == 13) {
    		return false;
    	}
    });

});