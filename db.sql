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
  `repost_count` int(11) NOT NULL DEFAULT '0' COMMENT '转发数',
  `comment_count` int(11) NOT NULL DEFAULT '0' COMMENT '评论数',
  `resume_count` int(11) NOT NULL DEFAULT '0' COMMENT '简历投递数目',
  `last_check` datetime DEFAULT NULL COMMENT '微博定时处理最后检查时间',
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `title` (`title`) USING BTREE,
  KEY `author_id` (`author_id`) USING BTREE,
  KEY `last_check` (`last_check`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `tjob`.`job_repost` (
  `id` varchar(50)  NOT NULL,
  `user_id` varchar(50)  NOT NULL,
  `screen_name` varchar(200)  NOT NULL,
  `created_at` datetime  NOT NULL,
  `weibo_info` longtext  NOT NULL,
  PRIMARY KEY (`id`)
)
ENGINE = InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE  `tjob`.`job_resume` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `job_id` int(10) unsigned NOT NULL,
  `user_id` varchar(50) CHARACTER SET latin1 NOT NULL,
  `introducer` varchar(50) NOT NULL COMMENT '职位介绍人',
  `filename` varchar(500) CHARACTER SET latin1 NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '简历状态：0未读；1已读 2接受 3拒绝',
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='职位简历'

-- 用户信息表
CREATE TABLE  `tjob`.`user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) DEFAULT NULL,
  `blogtype` varchar(20) DEFAULT NULL,
  `role` varchar(10) DEFAULT NULL,
  `info` longtext,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id_type` (`user_id`,`blogtype`) USING BTREE,
  KEY `created_at` (`created_at`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;