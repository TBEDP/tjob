// 详细页面逻辑
$(document).ready(function(){
    $('#update_resume_btn').click(function(){
        $('#introducer').val($('#resume_introducer').text());
        $('#upload_resume_form').show();
        $('#upload_btn').val('更新简历');
        $(this).hide();
    });
    
    // 检测是否可以提交数据
    // 选择了文件，回答了问题，才可以提交
    var _check_can_submit = function() {
    	var can_submit = true;
    	if(!$('#resume').val()) {
    		can_submit = false;
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
    $.getJSON('/job/' + job_id + '/repost_users/' + weibo_id, function(users){
    	if(util.get_dict_length(users) > 0) {
    		$('#repost_users').append('转发者: ');
    		for(var screen_name in users){
            	var item = {
            		screen_name: screen_name,
            		screen_name_encode: encodeURI(screen_name)
            	};
                $('#repost_users').append('<a target="_blank" href="http://t.sina.com.cn/n/{{screen_name_encode}}">@{{screen_name}}</a>&nbsp;&nbsp;'.format(item));;
            }
		}
    	if(current_user_id) {
	        var $introducer_selector = $('#introducer_selector');
	        var author = $('#author_link').text().substring(1);
	        var default_introducer = $('#resume_introducer').text().substring(1) || author;
	        users[author] = 1;
	        for(var screen_name in users){
	        	var item = {
            		screen_name: screen_name,
            		checked: ''
            	};
	        	if(screen_name == default_introducer) {
	        		item.checked = 'checked="checked"';
	        	}
	        	$introducer_selector.append('<input type="radio" class="radio" name="introducer" {{checked}} value="{{screen_name}}" /><lable class="radio_text">@{{screen_name}}</label>&nbsp;&nbsp;'.format(item));
	        }
	        $('.radio_text').click(function(){
	        	$(this).prev().click();
	        });
    	}
    });
});