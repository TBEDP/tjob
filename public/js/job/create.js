$(document).ready(function(){
    $('#desc, #title').keyup(function(){
        var text = '招聘#' + $('#title').val() + '#: ' + $('#desc').val();
//        if(text.wlength() > 125){
//            text = text.substring(0, 123) + '...';
//        }
        text += ' ' + 'http://t.cn/xxxxxx';
        $('#weibo_preview').html(text);
        $('#wordcount').html(140 - $('#weibo_preview').html().wlength());
    });
    $('#desc, #title').keyup(function(){
        $('#save_job_btn').show();
        $('#desc, #title').each(function(){
            if(!$(this).val()) {
                $('#save_job_btn').hide();
            }
        });
    }).keyup();
    
    $('#add_question_btn').click(function(){
        $('#addition_question').toggle();
        var need_question = $('#need_question').val();
        $('#need_question').val(need_question == '0' ? '1' : '0');
    });
    
    // 文件上传
    $('#file_upload').fileUploadUI({
        uploadTable: $('#uploadfiles'),
        downloadTable: $('#downloadfiles'),
        buildUploadRow: function (files, index) {
            return $('<tr><td>' + files[index].name + '<\/td>' +
                    '<td class="file_upload_progress"><div><\/div><\/td>' +
                    '<td class="file_upload_cancel">' +
                    '<button class="ui-state-default ui-corner-all" title="Cancel">' +
                    '<span class="ui-icon ui-icon-cancel">Cancel<\/span>' +
                    '<\/button><\/td><\/tr>');
        },
        buildDownloadRow: function (file) {
        	$('#downloadfiles').parent().show();
        	var count = $('#downloadfiles').find('input[type="radio"]').length;
        	var checked = count == 0 ? 'checked="checked"' : '';
            return $('<li><input type="radio" id="send_image_' + count + '" name="send_image" ' 
            	+ checked + ' /><label for="send_image_' + count + '">' 
            	+ (file.error || file.name) + '</label> <a href="/down/' 
            	+ file.name + '" target="_blank">查看</a></li>');
        }
    });
    
    // 添加视频
    $("#dialog-form").dialog({
		autoOpen: false,
		width: 600,
		modal: true,
		buttons: {
			"添加": function() {
    			var url = $('#video_text').val();
		    	var html = util.VideoService.attempt(url);
		        if(html) {
		            $('#text').val($('#text').val() + html);
		            $('#desc').val($('#desc').val() + ' ' + url);
		        }
    			$(this).dialog( "close" );
			},
			"取消": function() {
				$(this).dialog( "close" );
			}
		},
		close: function() {
			
		}
	});
    
    $("#add_video_btn").click(function() {
		$("#dialog-form").dialog("open");
	});
    
    // 视频预览
    $('#video_text').keyup(function(){
    	var html = util.VideoService.attempt($('#video_text').val());
    	if(html != $('#video_preview').html()) {
    		$('#video_preview').html(html);
    	}
    	if(html) {
    		$("#dialog-form").dialog({position: 'top'});
    	}
    });
    
    $('#save_job_btn').click(function(){
    	var title = $('#title').val();
    	var desc = $('#desc').val();
    	var send_image = $('input[name="send_image"]:checked').next().text();
    	var text = $('#text').val();
    	var job_id = $('#job_id').val();
    	var tags = [];
    	$('#tag_select .tag').each(function() {
    	    var $tag = $(this);
    	    if($tag.attr('checked')) {
    	        tags.push($tag.val());
    	    }
    	});
    	var params = {
    		title: title,
    		desc: desc,
    		send_image: send_image,
    		text: text,
    		tags: tags,
    		id: job_id
    	};
    	if($('#sync_weibo').attr('checked')) {
    	    params.sync_weibo = true;
    	}
    	$(this).attr('disabled', true);
    	$.post('/job/create', params, function(redirect_url){
    		window.location = redirect_url;
    	});
    });
});
