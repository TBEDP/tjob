var STRING_FORMAT_REGEX = /\{\{([\w\s\.\(\)"',-\[\]]+)?\}\}/g;
String.prototype.format = function(values) {
    return this.replace(STRING_FORMAT_REGEX, function(match, key) {
        return values[key] || eval('(values.' +key+')');
    });
};

$(document).ready(function(){
    $('#update_resume_btn').click(function(){
        $('#introducer').val($('#resume_introducer').text());
        $('#upload_resume_form').show();
        $('#upload_btn').val('更新简历');
        $(this).hide();
    });
    
    $('#resume').change(function(){
        $(this).val() ? $('#upload_btn').show() : $('#upload_btn').hide();
    });
    
    $('.close_job_btn').click(function(){
        if(confirm('确定要结束此招聘信息？')){
            var jobid = $(this).attr('jobid');
            $(this).attr('disabled', true);
            $.post('/job/' + jobid, {status:1}, function(result){
                window.location = window.location;
            });
        }
    });
    
    var job_id = $('#job_id').val(), weibo_id = $('#job_weibo_id').val();
    // 获取转发人列表
    $.getJSON('/job/' + job_id + '/repost_users/' + weibo_id, function(users){
    	if(users.length == 0) {
    		return;
    	}
        var html = '转发者: ';
        for(var i=0;i<users.length;i++){
        	var item = users[i];
        	item.screen_name_encode = encodeURI(item.screen_name);
            html += '&nbsp;&nbsp;<a target="_blank" href="http://t.sina.com.cn/n/{{screen_name_encode}}">@{{screen_name}}</a>'.format(item);
        }
        $('#repost_users').html(html);
    });
});