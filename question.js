// 问答

var mysql_db = require('./db.js').mysql_db;

function _insert_or_update(table, data, callback) {
	var pkid = data.id;
	if(!data.id) {
		delete data.id;
	}
	mysql_db.insert_or_update(table, data, function(err, result){
		if(err) {
			console.error(err);
		} else {
			if(result.insertId) {
				pkid = result.insertId;
			}
		}
		callback(pkid);
	});
};

/* 添加问题
 * params: {
 *     content: question content,
 *     author: user_id,
 *     category: 
 * }
 */
module.exports.save_question = function(params, callback) {
	var data = {
		content: params.content,
		author: params.author,
		category: params.category,
		id: params.id
	};
	_insert_or_update('question', data, callback);
};

module.exports.get_question = function(id, callback) {
	if(!id) {
		callback(null);
	} else {
		mysql_db.get_obj('question', {id: id}, callback);
	}
};

var get_questions = module.exports.get_questions = function(ids, callback){
	mysql_db.get_objs('question', 'id', ids, callback);
};

/* 保存答案
 * params: {
 *     id: answer_id, for update
 *     question_id, content, author
 * }
 */
module.exports.save_answer = function(params, callback) {
	var data = {
		question_id: params.question_id,
		content: params.content,
		author: params.author,
		id: params.id
	};
	_insert_or_update('answer', data, callback);
};

module.exports.get_answer = function(id, callback) {
	if(!id) {
		callback(null);
	} else {
		mysql_db.get_obj('answer', {id: id}, callback);
	}
};

// 2 sql
module.exports.get_answers = function(ids, callback){
	mysql_db.get_objs('answer', 'id', ids, function(answers){
		var question_ids = [];
		for(var k in answers){
			var answer = answers[k];
			question_ids.push(answer.question_id);
		}
		get_questions(question_ids, function(questions){
			for(var k in answers){
				var answer = answers[k];
				answer.question = questions[answer.question_id];
			}
			callback(answers);
		});
	});
};