var config = require('../config'),
    db = config.db.collection('personal_detail'),
    fs = require('fs');

exports.index = function(req, res){
  var userName = req.params.userName;
  var template = req.params.template;
  var data = fs.readFileSync('./public/templates/' + template + '/config.json', 'utf-8');
  data = eval('(' + data + ')');
  db.find({id:userName}).toArray(function(err, person){
    var personInfo = person[0];
    if(typeof personInfo == "undefined")
      personInfo = {};
    res.render('index', {dbData:personInfo, formInfo:data,  userName:userName, template:template});
  });
}

exports.showResume = function(req, res){
  var resume = req.params.resume;
  var template = req.params.template;
  db.find({_id : db.id(resume)}).toArray(function(err, person){
    res.render('../public/templates/' + template + '/resume', {layout:"../views/resume", id:resume, person:person[0]});
  });
}

exports.saveData = function(req, res){
  var data = req.body.data;
  var id = req.body.id;
  db.find({id: id}).toArray(function(err, person){
    if(err){
      console.log("err: " + err.toString);
      return res.render('error', {message : "保存用户信息错误！"});
    }
    if(person.length > 0){//此用户已存在于数据库
      db.update({id : id}, {$set:data}, function(err){
        if(err){
          console.log("err: " + err.toString());
          return res.render('error', {message : "更新用户信息到数据库失败！"});
        }
        resReturn(res, person[0]._id);
      });
    }
    else{//此用户未存在于数据库
      data['id'] = id;
      db.save(data, function(err, person1){
        if(err){
          console.log("err: " + err.toString);
          return res.render('error', {message : "新建用户到数据库失败！"});
        }
        resReturn(res, person1._id);
      });
    }
  });
}

function resReturn(res, msg){
  var temp = new Buffer(JSON.stringify({  msg : msg }));
  res.writeHead(200, {"Content/type":"text/json", "Content/length":temp.length});
  res.end(temp);
}


