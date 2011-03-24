# TaoJob Web System base on [Nodejs](http://nodejs.org).

## Requires:
 * [express](http://expressjs.com), web application.
 * [jqtpl](https://github.com/kof/node-jqtpl), html template engine.
 * [node-mysql](https://github.com/felixge/node-mysql), db client to connect the mysql.
 * [connect-form](https://github.com/visionmedia/connect-form), handle file uploading.

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
 * “我关注此职位” 的按钮，投递简历的按钮需要明显显示！
 
## TODO:
 * 支持视频链接，自动将目前大部分视频网站的链接转换为可以视频播放代码