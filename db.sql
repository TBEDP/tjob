-- 职位信息表
CREATE TABLE `job` (
`id`  int(10) UNSIGNED NOT NULL AUTO_INCREMENT ,
`title`  varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL ,
`desc`  varchar(300) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '要摘' ,
`text`  text CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '细详描述' ,
`author_id`  varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL ,
`weibo_info`  longtext CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '微博相关信息' ,
`created_at`  datetime NULL DEFAULT NULL ,
`updated_at`  timestamp,
PRIMARY KEY (`id`),
INDEX `title` USING BTREE (`title`) ,
INDEX `author_id` USING BTREE (`author_id`) 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8 COLLATE=utf8_general_ci
;

-- 用户信息表
CREATE TABLE `user` (
`id`  int(10) UNSIGNED NOT NULL AUTO_INCREMENT ,
`user_id`  varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL ,
`blogtype`  varchar(20) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL ,
`role`  varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL ,
`info`  longtext CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL ,
`created_at`  datetime NULL DEFAULT NULL ,
`updated_at`  timestamp,
PRIMARY KEY (`id`),
UNIQUE INDEX `user_id_type` USING BTREE (`user_id`, `blogtype`) ,
INDEX `created_at` USING BTREE (`created_at`) 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8 COLLATE=utf8_general_ci
;