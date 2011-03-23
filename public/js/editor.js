var editor_options = {
    // Location of TinyMCE script
    script_url : '/js/tiny_mce/tiny_mce.js',

    // General options
    height: '300',
    width: '100%',
    theme : "advanced",
    plugins : "pagebreak,layer,table,advimage,advlink,emotions,iespell,inlinepopups,insertdatetime,preview,media,searchreplace,print,contextmenu,paste,directionality,fullscreen,noneditable,visualchars,nonbreaking,xhtmlxtras,template,advlist",

    // Theme options
    theme_advanced_buttons1: 'forecolor,backcolor,fontselect,fontsizeselect,bold,italic,underline,strikethrough,|,undo,redo,|,cut,copy,paste,pastetext,pasteword,|,code',
    theme_advanced_buttons2: '',
    theme_advanced_buttons3: '',
    theme_advanced_buttons4: '',
//	        theme_advanced_buttons1 : "bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,fontselect,fontsizeselect",
//	        theme_advanced_buttons2 : "cut,copy,paste,pastetext,pasteword,|,search,replace,|,outdent,indent,|,undo,redo,|,link,unlink,anchor,image,cleanup,code,|,insertdate,inserttime,preview,|,forecolor,backcolor",
//	        theme_advanced_buttons3 : "tablecontrols,|,hr,removeformat,visualaid,|,sub,sup,|,charmap,emotions,iespell,media,advhr,|,print,|,ltr,rtl,|,fullscreen",
//	        theme_advanced_buttons4 : "insertlayer,moveforward,movebackward,absolute,|,styleprops,|,cite,abbr,acronym,del,ins,attribs,|,visualchars,nonbreaking,template,pagebreak",
    theme_advanced_toolbar_location : "top",
    theme_advanced_toolbar_align : "left",
    theme_advanced_statusbar_location : "bottom",
    theme_advanced_resizing : false,

    // Example content CSS (should be your site CSS)
    content_css : "/css/default.css",

    // Drop lists for link/image/media/template dialogs
    template_external_list_url : "lists/template_list.js",
    external_link_list_url : "lists/link_list.js",
    external_image_list_url : "lists/image_list.js",
    media_external_list_url : "lists/media_list.js",

    // Replace values for the template plugin
    template_replace_values : {
//	            username : "Some User",
//	            staffid : "991234"
    }
};

$(document).ready(function() {
    $('textarea.tinymce').tinymce(editor_options);
});