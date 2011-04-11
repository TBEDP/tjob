# TaoJob Web System base on [Nodejs](http://nodejs.org).

## Requires:
 * [connect](https://github.com/senchalabs/connect)
 * [express](http://expressjs.com), web application.
 * [jqtpl](https://github.com/kof/node-jqtpl), html template engine.
 * [node-mysql](https://github.com/felixge/node-mysql), db client to connect the mysql.
 * [connect-form](https://github.com/visionmedia/connect-form), handle file uploading.

## Add git submodule
 * git submodule add git://github.com/visionmedia/node-querystring.git deps/qs
 * git submodule add git://github.com/visionmedia/connect-form.git deps/connect-form
 * git submodule add git://github.com/felixge/node-formidable.git deps/formidable
 * git submodule add git://github.com/felixge/node-mysql.git deps/mysql
 * git submodule add git://github.com/fengmk2/node-weibo.git deps/node-weibo

## Weibo Account
 * sina: [@淘job](http://t.sina.com.cn/tjob "淘job")
 * demo: [Taojob](http://taojob.tbdata.org "更多好职位等你，来淘宝工作吧")
 
## Start Web Script:
    node index.js
    // some log come out.

## 如何吸引别人转发，如何保证信息的传播范围
 * 基于问题的招聘信息：发布一个跟职位相关的问题，如果能回答出来，就是我们想找的人或者才会得到面试的机会。
 * 答题(@timyang 的[多IDC数据时序问题及方法论](http://timyang.net/architecture/method/) )，打分，排行榜
 * 转发累积积分，主要是让转发的人有参与感。
 * 转发关系图，根据转发关系，将人链接起来。
 * 直接投递代码
 * “我关注此职位 Like” 的按钮，投递简历的按钮需要明显显示！

 
## TODO:
 * done 支持视频链接，自动将目前大部分视频网站的链接转换为可以视频播放代码
 * 生成文字图片
 * 支持表情
 * 明显的转发奖励说明，网站上显示，发微博的时候带上
