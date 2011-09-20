# Visual Resume
# by Sandy Wong 黄聪 2011年09月19日 星期一 21时55分00秒

## Description

本应用用于生成可视化简历，根据简历模板的配置文件，生成相对应的表单，让用户填入个人信息，保存到mongodb数据库中，并生成可视化简历。

## Install

    $ npm install express ejs mongoskin mongodb
    
## Run
    
    $ node visualResume/server.js
    
## files

简历模板
    放在visualResume/public/templates中以模板名称命名的文件夹中，里面包含一
个配置文件、一个html文件和一个css文件:
    配置文件config.json：用于生成表单。description代表div的描述信息，addAble表示该div的属性是是否重复生成多个，form表示表单内容（大括号前为表单的id，不可重复），type表示表单类型，show表示显示文字
    resume.html：可视化简历的正文。根据对应div的id生成可视化图像，目前支持一下：basicInfo（用户基本信息，包括名称、性别、籍贯、年龄）、rader（能力雷达图）、pieChart（圆盘，支持圆心角、半径两个维度）、tags（个性化标签）、timeAxis（以时间轴为中心，表示时间跨度的事件，支持上下两种事件）。使用时必须输入对应参数，参数要与配置文件内容相对应，详细可参考test模板。
    resume.css：控制可视化简历的样式。

自定义的画图js库
    路径为visualResume/public/scripts/draw.js。每个图像化方式封装成一个函数，定义并监测是否有对应id的div，若有则调用该函数。新的图形化函数可在此文件中添加。

view文件
     放在visualResume/views/文件夹中。index.html为根据配置文件生成表单的view文件，layout.html是它的layout文件，而resume.html为可视化简历的layout文件。
