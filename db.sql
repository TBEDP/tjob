-- 职位信息表
CREATE TABLE  `tjob`.`job` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(200) DEFAULT NULL,
  `desc` varchar(300) DEFAULT NULL COMMENT '要摘',
  `text` text COMMENT '细详描述',
  `author_id` varchar(50) DEFAULT NULL,
  `weibo_id` varchar(50) DEFAULT NULL,
  `weibo_info` longtext COMMENT '微博相关信息',
  `repost_id` varchar(50) DEFAULT NULL,
  `fetch_repost` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '是否需要获取详细的转发信息: 0 否，1是',
  `repost_since_id` varchar(50) DEFAULT NULL,
  `repost_count` int(11) NOT NULL DEFAULT '0' COMMENT '转发数',
  `comment_count` int(11) NOT NULL DEFAULT '0' COMMENT '评论数',
  `resume_count` int(11) NOT NULL DEFAULT '0' COMMENT '简历投递数目',
  `check_same_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '连续检测结果相同的次数',
  `last_check` datetime DEFAULT NULL COMMENT '微博定时处理最后检查时间',
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '0 正常 1 结束',
  `log` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `title` (`title`) USING BTREE,
  KEY `author_id` (`author_id`) USING BTREE,
  KEY `last_check` (`last_check`),
  KEY `fetch_repost` (`fetch_repost`),
  KEY `desc` (`desc`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE  `tjob`.`job_repost` (
  `id` varchar(50) NOT NULL,
  `source_id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `screen_name` varchar(200) NOT NULL,
  `created_at` datetime NOT NULL,
  `weibo_info` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `source_id` (`source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE  `tjob`.`job_resume` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `job_id` int(10) unsigned NOT NULL,
  `user_id` varchar(50) CHARACTER SET latin1 NOT NULL,
  `introducer` varchar(50) NOT NULL COMMENT '职位介绍人',
  `filepath` varchar(1000) NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '简历状态：0未读；1已读 2接受 3拒绝',
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_id_user_id` (`job_id`,`user_id`),
  KEY `job_id` (`job_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='职位简历';

-- 用户信息表
CREATE TABLE  `tjob`.`user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) DEFAULT NULL,
  `blogtype` varchar(20) DEFAULT NULL,
  `role` varchar(200) DEFAULT NULL,
  `info` longtext,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id_type` (`user_id`,`blogtype`) USING BTREE,
  KEY `created_at` (`created_at`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- grant all privileges on tjob.* to taojob@localhost identified by 'xxx';

-- update sql

ALTER TABLE `tjob`.`job` ADD COLUMN `question_id` int  COMMENT '问答id，如果没有问题，则为空' AFTER `repost_id`;

ALTER TABLE `tjob`.`job_resume` ADD COLUMN `answer_id` int;

ALTER TABLE `tjob`.`job_resume` MODIFY COLUMN `introducer` VARCHAR(50)  CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '职位介绍人',
 MODIFY COLUMN `filepath` VARCHAR(1000)  CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
 MODIFY COLUMN `size` INTEGER UNSIGNED DEFAULT NULL,
 ADD COLUMN `comment` longtext  COMMENT '反馈' AFTER `answer_id`;


CREATE TABLE  `tjob`.`question` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(50) DEFAULT NULL COMMENT '问题类别\n',
  `content` longtext,
  `author` varchar(50) CHARACTER SET latin1 DEFAULT NULL COMMENT '问题创建人',
  `updated_at` timestamp,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE  `tjob`.`answer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `question_id` int(11) DEFAULT NULL,
  `content` longtext,
  `score` int(11) DEFAULT NULL COMMENT '默认未评分的为空',
  `author` varchar(50) DEFAULT NULL COMMENT '问题创建人',
  `updated_at` timestamp,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


-- 3.24

ALTER TABLE `tjob`.`job` ADD COLUMN `like_count` int UNSIGNED DEFAULT 0 AFTER `resume_count`;

CREATE TABLE `tjob`.`job_like` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id` int UNSIGNED,
  `user_id` varchar(50) ,
  `created_at` timestamp ,
  PRIMARY KEY (`id`),
  unique INDEX `job_user`(`job_id`, `user_id`)
)
ENGINE = InnoDB DEFAULT CHARSET=utf8;
ALTER TABLE `tjob`.`job_like` ADD INDEX `jobid`(`job_id`),
 ADD INDEX `user_id`(`user_id`);

-- 3.28 add user_friends: 用户跟随的人

ALTER TABLE `tjob`.`user` ADD COLUMN `fetch_friends_cursor` varchar(100)  
    DEFAULT NULL COMMENT '获取所关注的人游标' AFTER `updated_at`;
ALTER TABLE `tjob`.`user` ADD COLUMN `fetch_friends_date` datetime  
    COMMENT '获取关注人的时间' AFTER `fetch_friends_cursor`;


CREATE TABLE  `tjob`.`user_friends` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) DEFAULT NULL COMMENT '用户id',
  `friend_id` varchar(50) DEFAULT NULL COMMENT '用户跟随的人的id',
  `friend_screen_name` varchar(200) DEFAULT NULL,
  `friend_user` longtext,
  PRIMARY KEY (`id`),
  UNIQUE KEY `relation` (`user_id`,`friend_id`),
  KEY `user_id` (`user_id`),
  KEY `friend_screen_name` (`friend_screen_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8

-- 执行 node fixed_job_repost_user_id.js 修复job_repost user_id格式不正确的问题