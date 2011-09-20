/*
 功能:画能力的雷达面积图
 参数:输入的数据, aspect对应的属性名, score对应的属性名
 */
function drawRader(data, aspect, score){
  if(!data || !data.length || data.length < 3){
    return;
  }
  var width = $("#rader")[0].clientWidth;
  var height = $("#rader")[0].clientHeight;
  var radius = Math.min(width, height) * 0.8 / 2;
  var paper = Raphael("rader");
  //计算出能力图的所有定点
  var vertexX = new Array(data.length);
  var vertexY = new Array(data.length);
  for(var i = 0; i < data.length; i++){
    vertexX[i] = radius * Math.sin(Math.PI * 2 * i / data.length) + width/2;
    vertexY[i] = -radius * Math.cos(Math.PI * 2 * i / data.length) + height/2;
  }
  //多边形底色
  var bg = "";
  for(var i = 0; i < data.length; i++){
    bg += "L" + vertexX[i];
    bg += "," + vertexY[i];
  }
  bg = 'M' + bg.substring(1);
  bg += " z";
  paper.path(bg).attr({fill : "#77dd11", stroke : "#77dd11"});
  //文字
  for(var i = 0; i < data.length; i++){
    var rate = 1/7;
    paper.text(vertexX[i]*(1+rate)-width/2*rate, vertexY[i]*(1+rate)-height/2*rate, data[i]['aspect'+i]).attr({"font-size":12});
  }
  //能力多边形
  var abilityArea = "";
  for(var i = 0; i < data.length; i++){
    var k = parseFloat(data[i]['score'+i]) / 10;
    abilityArea += "L" + (vertexX[i]*k + (1-k)*width/2);
    abilityArea += "," + (vertexY[i]*k + (1-k)*height/2);
  }
  abilityArea= 'M' + abilityArea.substring(1);
  abilityArea += " z";
  paper.path(abilityArea).attr({fill : "#f45580", stroke : "#f45580"});
  //同心多边形
  for(var level = 0; level < 3; level++){
    var sides = "";
    var k = (level+1)/3;
    for(var i = 0; i < data.length; i++){
      sides += "L" + (vertexX[i]*k + (1-k)*width/2);
      sides += "," + (vertexY[i]*k + (1-k)*height/2);
    }
    sides = 'M' + sides.substring(1);
    sides += " z";
    paper.path(sides).attr({stroke : "#424242", "stroke-opacity":0.6});
  }
  //连心线
  var diagonals = "";
  for(var i = 0; i < data.length; i++){
    diagonals += "M" + vertexX[i] + "," + vertexY[i];
    diagonals += "L" + (width/2) + "," + (height/2);
  }
  paper.path(diagonals).attr({stroke : "#424242", "stroke-opacity":0.6});
}
if($("#rader")[0]){
  var data = dbDataMap("rader", "data");
  var aspect = dbDataMap("rader", "aspect");
  var score = dbDataMap("rader", "score");
  drawRader(data, aspect, score);
}

/*
 功能:画时间轴，并加上经验等等
 参数:输入的数据，对应的属性名
 */
function drawTimeAxis(title1, data1, attr1, title2, data2, attr2){
  if(!data1)
    data1 = {};
  if(!data2)
    data2 = {};
  if(!data1.length || !data2.length || data1.length+data2.length <= 0)
    return;
  var startTime1 = attr1['startTime'];
  var endTime1 = attr1['endTime'];
  var name1 = attr1['name'];
  var description1 = attr1['description'];
  var startTime2 = attr2['startTime'];
  var endTime2 = attr2['endTime'];
  var name2 = attr2['name'];
  var description2 = attr2['description'];

  var paper = Raphael("timeAxis");
  var winWidth = $("#timeAxis")[0].clientWidth;
  var winHeight = $("#timeAxis")[0].clientHeight;
  var rect1 = new Array(data1.length);
  var rect2 = new Array(data2.length);
  var defaultHeight = 30;
  var increaseHeight = 20;
  var axisTop = 0.5 * winHeight - 0.5*defaultHeight;
  var minTime;
  var maxTime;
  if(data1[0]){
    minTime = data1[0][startTime1+'0'];
    maxTime = data1[0][endTime1+'0'];
  }
  else{
    minTime = data2[0][startTime2+'0'];
    maxTime = data2[0][endTime2+'0'];
  }
  //找到最小时间和最大时间，并初始化各矩形的属性值
  for(var i = 0; i < data1.length; i++){
    if(compareTime(minTime, data1[i][startTime1+i]) != false && compareTime(minTime, data1[i][startTime1+i]) < 0){
      minTime = data1[i][startTime1+i];
    }
    if(compareTime(maxTime, data1[i][endTime1+i]) != false && compareTime(maxTime, data1[i][endTime1+i]) > 0){
      maxTime = data1[i][endTime1+i];
    }
    rect1[i] = {};
    rect1[i]['height'] = defaultHeight;
  }
  for(var i = 0; i < data2.length; i++){
    if(compareTime(minTime, data2[i][startTime2+i]) != false && compareTime(minTime, data2[i][startTime2+i]) < 0){
      minTime = data2[i][startTime2+i];
    }
    if(compareTime(maxTime, data2[i][endTime2+i]) != false && compareTime(maxTime, data2[i][endTime2+i]) > 0){
      maxTime = data2[i][endTime2+i];
    }
    rect2[i] = {};
    rect2[i]['height'] = defaultHeight;
  }

  minTime = minTime.substring(0, 5) + "00";
  maxTime = maxTime.substring(0, 5) + "12";
  var range = compareTime(minTime, maxTime);
  for(var i = 0; i < data1.length; i++){
    rect1[i]['left'] = winWidth * compareTime(minTime, data1[i][startTime1+i]) / range;
    rect1[i]['length'] = winWidth * compareTime(data1[i][startTime1+i], data1[i][endTime1+i]) / range;
  }
  for(var i = 0; i < data2.length; i++){
    rect2[i]['left'] = winWidth * compareTime(minTime, data2[i][startTime2+i]) / range;
    rect2[i]['length'] = winWidth * compareTime(data2[i][startTime2+i], data2[i][endTime2+i]) / range;
  }

  //矩形排序，并调整其高度
  var timeZones = new Array(range);
  var rectIndex1 = new Array(rect1.length);
  for(var i = 0; i < rect1.length; i++){
    rectIndex1[i] = i;
  }
  for(var i = 0; i < rect1.length-1; i++){
    for(var j = rect1.length-1; j > i; j--){
      if(rect1[rectIndex1[j]]['length'] < rect1[rectIndex1[j-1]]['length']){
        var temp = rectIndex1[j];
        rectIndex1[j] = rectIndex1[j-1];
        rectIndex1[j-1] = temp;
      }
    }
  }
  for(var i = 0; i < timeZones.length; i++){
    timeZones[i] = new Array();
    for(var j = 0; j < rect1.length; j++){
      if(rect1[rectIndex1[j]]['left']/winWidth*range <= i 
        && (rect1[rectIndex1[j]]['left']+rect1[rectIndex1[j]]['length'])/winWidth*range >= i){
        timeZones[i].push(rectIndex1[j]);
      }
    }
    if(timeZones[i].length > 1){
      for(var k = 1; k < timeZones[i].length; k++){
        if(rect1[timeZones[i][k]]['height'] <= rect1[timeZones[i][k-1]]['height']){
          rect1[timeZones[i][k]]['height'] = rect1[timeZones[i][k-1]]['height'] + increaseHeight;
        }
      }
    }
  }
  var rectIndex2 = new Array(rect2.length);
  for(var i = 0; i < rect2.length; i++){
    rectIndex2[i] = i;
  }
  for(var i = 0; i < rect2.length-1; i++){
    for(var j = rect2.length-1; j > i; j--){
      if(rect2[rectIndex2[j]]['length'] < rect2[rectIndex2[j-1]]['length']){
        var temp = rectIndex2[j];
        rectIndex2[j] = rectIndex2[j-1];
        rectIndex2[j-1] = temp;
      }
    }
  }
  for(var i = 0; i < timeZones.length; i++){
    timeZones[i] = new Array();
    for(var j = 0; j < rect2.length; j++){
      if(rect2[rectIndex2[j]]['left']/winWidth*range <= i 
        && (rect2[rectIndex2[j]]['left']+rect2[rectIndex2[j]]['length'])/winWidth*range >= i){
        timeZones[i].push(rectIndex2[j]);
      }
    }
    if(timeZones[i].length > 1){
      for(var k = 1; k < timeZones[i].length; k++){
        if(rect2[timeZones[i][k]]['height'] <= rect2[timeZones[i][k-1]]['height']){
          rect2[timeZones[i][k]]['height'] = rect2[timeZones[i][k-1]]['height'] + increaseHeight;
        }
      }
    }
  }
  //画出矩形,以及名称、详细表述等等
  var colors = new Array();
  colors[0] = "rgb(139,96,178)";
  colors[1] = "rgb(252,223,35)";
  colors[2] = "rgb(228,79,119)";
  colors[3] = "rgb(74,161,214)";
  colors[4] = "rgb(250,150,72)";
  colors[5] = "rgb(154,204,105)";
  for(var i  = rect1.length-1; i >= 0; i--){
    //var rectColor = "rgb(" + (100+Math.random()*155) + ", " + (100+Math.random()*155) + ", " + (100+Math.random()*155) + ")";
    if(rect1[rectIndex1[i]]['length'] > 0){
      var rectDraw = paper.rect(rect1[rectIndex1[i]]['left'], axisTop-rect1[rectIndex1[i]]['height'], rect1[rectIndex1[i]]['length'], rect1[rectIndex1[i]]['height']+5, 5);
      rectDraw.attr({fill:colors[i%6], stroke:colors[i%6]});
      rectDraw.showDetail = false;
      rectDraw[0].id = "rectUp"+rectIndex1[i];
      var circleCenterX = rect1[rectIndex1[i]]['left'] + rect1[rectIndex1[i]]['length'] * 0.5;
      var circleCenterY = axisTop-rect1[rectIndex1[i]]['height']-3;
      paper.circle(circleCenterX, circleCenterY, 3);
      var increase = (rect1[rectIndex1[i]]['height']-defaultHeight)/increaseHeight;
      var descriptionLine = "M"+ circleCenterX +"," + (circleCenterY-60-increase*5) + "L" + circleCenterX +","+(circleCenterY-3);
      paper.path(descriptionLine);
      paper.text(circleCenterX, circleCenterY-70-increase*5, data1[rectIndex1[i]][(name1+rectIndex1[i])]).attr({"font-size":15, "font-family":"Dejavu"});
      rectDraw.mouseover(function(event){
        var src = event.target || event.srcElement;
        var srcIndex = src.id.match(/\d+/g)[0];
        if(!src.raphael.attrs.showDetail){
          flipDiv($("#timeAxis")[0], "descriptionDiv", src.raphael.attrs.x+0.5*src.raphael.attrs.width+5, src.raphael.attrs.y, data1[srcIndex][description1+srcIndex]||'', true);
          src.raphael.attrs.showDetail = true;
        }
      });
      rectDraw.mouseout(function(event){
        if($("#descriptionDiv")[0]){
          var src = event.target || event.srcElement;
          $("#descriptionDiv")[0].parentNode.removeChild($("#descriptionDiv")[0]);
          src.raphael.attrs.showDetail = false;
        }
      });
    }
  }
  for(var i  = rect2.length-1; i >= 0; i--){
    //var rectColor = "rgb(" + (100+Math.random()*155) + ", " + (100+Math.random()*155) + ", " + (100+Math.random()*155) + ")";
    if(rect2[rectIndex2[i]]['length'] > 0){
      var rectDraw = paper.rect(rect2[rectIndex2[i]]['left'], axisTop+defaultHeight-5, rect2[rectIndex2[i]]['length'], rect2[rectIndex2[i]]['height']+5, 5);
      rectDraw.attr({fill:colors[5-i%6], stroke:colors[5-i%6]});
      rectDraw.showDetail = false;
      rectDraw[0].id = "rectDown"+rectIndex2[i];
      var circleCenterX = rect2[rectIndex2[i]]['left'] + rect2[rectIndex2[i]]['length'] * 0.5;
      var circleCenterY = axisTop+defaultHeight+rect2[rectIndex2[i]]['height']+3;
      paper.circle(circleCenterX, circleCenterY, 3);
      var increase = (rect2[rectIndex2[i]]['height']-defaultHeight)/increaseHeight;
      var descriptionLine = "M"+ circleCenterX +"," + (circleCenterY+60+increase*5) + "L" + circleCenterX +","+(circleCenterY+3);
      paper.path(descriptionLine);
      paper.text(circleCenterX, circleCenterY+70+increase*5, data2[rectIndex2[i]][(name2+rectIndex2[i])]).attr({"font-size":15, "font-family":"Dejavu"});
      rectDraw.mouseover(function(event){
        var src = event.target || event.srcElement;
        var srcIndex = src.id.match(/\d+/g)[0];
        if(!src.raphael.attrs.showDetail){
          flipDiv($("#timeAxis")[0], "descriptionDiv", src.raphael.attrs.x+0.5*src.raphael.attrs.width+5, src.raphael.attrs.y+src.raphael.attrs.height, data2[srcIndex][description2+srcIndex]||'', false);
          src.raphael.attrs.showDetail = true;
        }
      });
      rectDraw.mouseout(function(event){
        if($("#descriptionDiv")[0]){
          var src = event.target || event.srcElement;
          $("#descriptionDiv")[0].parentNode.removeChild($("#descriptionDiv")[0]);
          src.raphael.attrs.showDetail = false;
        }
      });
    }
  }
  //根据最大最小时间画出时间轴
  var isLight = false;
  for(var i = 0; i < range/12; i++){
    var timeRect = paper.rect(winWidth*12/range*i, axisTop, winWidth*12/range, defaultHeight);
    var timeText = paper.text(winWidth*(12*i+6)/range, axisTop+defaultHeight/2, ""+(parseInt(minTime.substring(0,4))+i));
    if(isLight){
      timeRect.attr({fill:"#cccccc", stroke:"#cccccc"});
      timeText.attr({fill:"#c1ff15", "font-size":20});
    }
    else{
      timeRect.attr({fill:"#e6e7e8", stroke:"#e6e7e8"});
      timeText.attr({fill:"#f22a6c", "font-size":20});
    }
    isLight = !isLight;
  }
  //在左上角和左下角分别打印出标题
  if(title1 != "")
    paper.text(10, 15, title1).attr({"text-anchor":"start", fill:"blue", "font-size":20, "font-family":"Dejavu"});
  if(title2 != "")
  paper.text(10, winHeight-15, title2).attr({"text-anchor":"start", fill:"blue", "font-size":20, "font-family":"Dejavu"});
}
if($("#timeAxis")[0]){
  var attrs1 = {"startTime":divAttrMap("timeAxis", "startTimeUp"), "endTime":divAttrMap("timeAxis", "endTimeUp"),
    "name":divAttrMap("timeAxis", "nameUp"), "description":divAttrMap("timeAxis", "descriptionUp")};
  var attrs2 = {"startTime":divAttrMap("timeAxis", "startTimeDown"), "endTime":divAttrMap("timeAxis", "endTimeDown"),
    "name":divAttrMap("timeAxis", "nameDown"), "description":divAttrMap("timeAxis", "descriptionDown")};
  drawTimeAxis(divAttrMap("timeAxis","titleUp") , dbDataMap("timeAxis", "dataUp"), attrs1, divAttrMap("timeAxis", "titleDown"), dbDataMap("timeAxis", "dataDown") , attrs2);
}

/*
 功能:生成个性化标签
 参数:标签数组,标签词语对应的属性名
 */
function drawTags(tags, word){
  if(!tags)
    return;
  if(tags.length < 1)
    return;
  var winWidth = $("#tags")[0].clientWidth;
  var winHeight = $("#tags")[0].clientHeight;
  var maxMargin = 60/tags.length;
  var minMargin = 5;
  var sideNum = Math.ceil(Math.sqrt(tags.length));
  var colors = new Array();
  colors[0] = "rgb(139,96,178)";
  colors[1] = "rgb(252,223,35)";
  colors[2] = "rgb(228,79,119)";
  colors[3] = "rgb(74,161,214)";
  colors[4] = "rgb(250,150,72)";
  colors[5] = "rgb(154,204,105)";
  var randomTop; 
  for(var i = 0; i < tags.length; i++){
    var tagDiv = document.createElement("div");
    tagDiv.style.width = ((winWidth-10-sideNum*2*maxMargin)/sideNum) + "px";
    tagDiv.style.height = tagDiv.style.width.match(/\d+/g)[0] * 0.8 + "px";
    tagDiv.style["marginLeft"] = (minMargin + Math.random()*(maxMargin-minMargin)) + "px";
    tagDiv.style["marginRight"] = (minMargin + Math.random()*(maxMargin-minMargin)) + "px";
    if(i % sideNum == 0)
      randomTop = (minMargin + Math.random()*(maxMargin-minMargin))*0.8;
    if(tags.length != sideNum*sideNum && tags.length > 3 && i < sideNum){
      tagDiv.style["marginTop"] = randomTop+winHeight/sideNum/2 + "px";
    }
    else{
      tagDiv.style["marginTop"] = randomTop + "px";
    }
    tagDiv.style["marginBottom"] = randomTop + "px";
    tagDiv.style['cssFloat'] = "left";
    $("#tags")[0].appendChild(tagDiv);
    var paper = Raphael(tagDiv);
    //var set = paper.set();
    //set.push(
      //paper.rect(10, 10, tagDiv.clientWidth-maxMargin, tagDiv.clientHeight-maxMargin, 10).attr({fill:colors[i%6], stroke:colors[i%6]}),
    //var tagText = paper.text(tagDiv.clientWidth/2, tagDiv.clientHeight/2, tags[i][word+i]).attr({"font-size":tagDiv.clientWidth/tags[i][word+i].length*(Math.random()*0.4+0.6), height:tagDiv.clientHeight*0.8, fill:colors[i%6]})
    //);
    //set.rotate(Math.random()*45-25.5);
    var tagText = paper.text(tagDiv.clientWidth/2, tagDiv.clientHeight/2, tags[i][word+i]);
    var rotateAngle = Math.random()*45-25.5;
    tagText.rotate(rotateAngle);
    tagText.attr({"font-size":tagDiv.clientWidth/Math.cos(rotateAngle/180*Math.PI)/tags[i][word+i].length*0.9, height:tagDiv.clientHeight*0.8, fill:colors[i%6]});
  }
}
if($("#tags")[0]){
  drawTags(dbDataMap("tags", "data"), divAttrMap("tags", "tag"));
}

/*
 功能:画出圆饼图,分别用半径圆心角表示两个维度
 参数:输入数据，名称对应属性，半径对应属性，圆心角对应属性，
      显示(radius半径对应意思、angle圆心角对应意思、radiusQuan半径对应的量词、angleQuan圆心角对应量词)
 */
function drawPieChart(data, name, radiusAtt, angleAtt, show){
  if(!data)
    return;
  var winWidth = $("#pieChart")[0].clientWidth;
  var winHeight = $("#pieChart")[0].clientHeight;
  var maxRadius = Math.min(winWidth, winHeight-15)/2;
  var paper = Raphael("pieChart");
  var colors = new Array();
  colors[0] = "#f6f73a";
  colors[1] = "#08fb7d";
  colors[2] = "#ff303a";
  colors[3] = "#376ea6";
  colors[4] = "#ffbe4a";
  var angleTotal = 0;
  for(var i = 0; i < data.length; i++){
    angleTotal += parseFloat(data[i][angleAtt+i]);
  }
  var angle = new Array(data.length);
  var currentAngle = 0;
  for(var i = 0; i < data.length; i++){
    var r = parseFloat(data[i][radiusAtt+i]) / 10 * maxRadius;
    angle[i] = data[i][angleAtt+i] / angleTotal * 2 * Math.PI;
    var path = "M" + (winWidth/2) + "," + (winHeight/2-15) + "l" + (r*Math.sin(currentAngle)) + "," + (-r*Math.cos(currentAngle)) + "A" + r + "," + r + " 0 " + (angle[i] > Math.PI ? "1" : "0") + " 1 " + (winWidth/2+r*Math.sin(currentAngle+angle[i])) + "," + (winHeight/2-15-r*Math.cos(currentAngle+angle[i])) + " z";
    var area = paper.path(path).attr({fill:colors[i%5], stroke:colors[i%5]});
    area.translate(10*Math.sin(currentAngle+angle[i]/2), -10*Math.cos(currentAngle+angle[i]/2));
    paper.text(winWidth/2+r*0.6*Math.sin(currentAngle+angle[i]/2), winHeight/2-15-r*0.6*Math.cos(currentAngle+angle[i]/2), data[i][name+i]).attr({"font-size":15});
    area.showDetail = false;
    area[0].id = "pie" + i;
    area.mouseover(function(event){
      var src = event.target || event.srcElement;
      var srcIndex = src.id.match(/\d+/g)[0];
      if(!src.raphael.attr.showDetail){
        currentAngle = 0;
        for(var i = 0; i < srcIndex; i++)
          currentAngle += parseFloat(angle[i]);
        flipDiv($("#pieChart")[0], "pieChartShow", winWidth/2+r*0.8*Math.sin(currentAngle+angle[srcIndex]/2)-5, winHeight/2-15-r*0.8*Math.cos(currentAngle+angle[srcIndex]/2), show["radius"]+" : "+data[srcIndex][radiusAtt+srcIndex]+show["radiusQuan"]+"   "+show["angle"]+" : "+data[srcIndex][angleAtt+srcIndex]+show["angleQuan"], true);
      }
    });
    area.mouseout(function(event){
      if($("#pieChartShow")[0]){
        var src = event.target || event.srcElement;
        $("#pieChartShow")[0].parentNode.removeChild($("#pieChartShow")[0]);
        src.raphael.attrs.showDetail = false;
      }
    });
    currentAngle += angle[i];
  }
  var tips = "";
  if(show["radius"] != "")
    tips += "半径表示" + show["radius"];
  if(show["angle"] != ""){
    if(tips != "")
      tips += ", ";
    tips += "圆心角表示" + show["angle"];
  }
  if(tips != "")
    paper.text(winWidth, winHeight-15, tips).attr({"font-size":12, "text-anchor":"end"});
}
if($("#pieChart")[0]){
  var attrs = {"radius":divAttrMap("pieChart", "radiusShow"), "angle":divAttrMap("pieChart", "angleShow"), "radiusQuan":divAttrMap("pieChart", "radiusQuan"), "angleQuan":divAttrMap("pieChart", "angleQuan")};
  drawPieChart(dbDataMap("pieChart", "data"), divAttrMap("pieChart", "show"), divAttrMap("pieChart", "radius"), divAttrMap("pieChart", "angle"), attrs);
}

/*
 功能:显示用户基本信息(包括姓名、性别、年龄、籍贯)
 参数:姓名、性别、年龄、籍贯
 */
function drawBasicInfo(){
  var name = dbData.name;
  var sex = dbData.sex;
  var age = dbData.age;
  var location = dbData.location;
  var winWidth = $("#basicInfo")[0].clientWidth;
  var winHeight = $("#basicInfo")[0].clientHeight;
  var paper = Raphael("basicInfo");
  paper.text(winWidth, 0.6*winHeight/2, name).attr({"font-size":winWidth*0.45/name.length, "text-anchor":"end"});
  var detailInfo = "";
  if(sex)
    detailInfo += "性别：" + (sex == "male" ? "男" : "女");
  if(age)
    detailInfo += "  年龄：" + age;
  if(location)
    detailInfo += "  籍贯：" + location;
  paper.text(winWidth-5, winHeight-0.3*winHeight/2, detailInfo).attr({"font-size":12, "text-anchor":"end"});
}
if($("#basicInfo")[0])
  drawBasicInfo();

/*
 功能:显示用户联系方式(包括电话、邮箱)
 参数:电话、邮箱
 */
function drawContact(tel, mail){
  var winWidth = $("#contact")[0].clientWidth;
  var winHeight = $("#contact")[0].clientHeight;
  var paper = Raphael("contact");
  paper.path("M0,0L"+winWidth+",0").attr({"stroke-width":1});
  var contactInfo = "";
  if(tel)
    contactInfo += "电话：" + tel;
  if(mail)
    contactInfo += "    邮箱：" + mail;
  paper.text(winWidth/2, winHeight/2, contactInfo).attr({"font-size":12});
}
if($("#contact")[0]){
  drawContact(dbData.cellPhone, dbData.mail);
}

/***************************辅助函数****************************/

/*
 功能:比较两个时间，返回后者减去前者的时间差
 参数:两个时间，格式为string,用-隔开，如"2011-04"
 */
function compareTime(time1, time2){
  var t1 = time1.split('-');
  var t2 = time2.split('-');
  if(t1.length != 2 || t2.length != 2)
    return false;
  var result = (parseInt(t2[0]) - parseInt(t1[0])) * 12;
  result += parseInt(t2[1]) - parseInt(t1[1]);
  return result;
}

/*
 功能:弹窗
 参数:母节点，弹窗id, 弹窗的x、y属性，弹窗的内容
 */
function flipDiv(parent, id, x, y, text, isUp){
  if(text == '')
    return null;
  var div = document.createElement("div");
  div.setAttribute("id", id);
  div.style.position = "relative";
  var line = 1;
  if(text.length < 10){
    div.style.width = (25 + text.length*13) + "px";
    div.style.height = "45px";
  }
  else{
    div.style.width = (25 + 10*13) + "px";
    line = Math.ceil(text.length/10);
    div.style.height = (45 + line*10) + "px";
  }
  if(line > 1){
    var temp = "";
    for(var i = 0; i < text.length; i++){
      temp += text[i];
      if(i%10==0 && i!=0)
        temp += '\n';
    }
    text = temp;
  }
  if(isUp){
    div.style.left = x + "px";
    var h = div.style.height.match(/\d+/g)[0];
    div.style.top = (y-h-parent.clientHeight) + "px";
  }
  else{
    div.style.left = x + "px";
    div.style.top = (y-parent.clientHeight) + "px";
  }
  parent.appendChild(div);
  //对话框
  var paper = Raphael(id);
  var c = 20;
  var path;
  if(isUp){
    path = "M20," + (div.clientHeight-10) + "L" + c + "," + (div.clientHeight-10) + "C0," + (div.clientHeight-10) + " 0," + (div.clientHeight-10) + " 0," + (div.clientHeight-10-c) + "L0," + c + "C0,0 0,0 " + c + ",0L" + (div.clientWidth-c) + ",0C" + div.clientWidth + ",0 " + div.clientWidth + ",0 " + div.clientWidth + "," + c + "L" + div.clientWidth + "," + (div.clientHeight-10-c) + "C" + div.clientWidth + "," + (div.clientHeight-10) + " " + div.clientWidth + "," + (div.clientHeight-10) + " " + (div.clientWidth-c) + "," + (div.clientHeight-10) + "L" + (c+15) + "," + (div.clientHeight-10) + "L" + (c-5) + "," + div.clientHeight + " z";
  }
  else{
    path = "M20,10L" + c + ",10C0,10 0,10 0," + (10+c) + "L0," + (div.clientHeight-c) + "C0,"+ div.clientHeight +" 0," + div.clientHeight + " " + c + "," + div.clientHeight + "L" + (div.clientWidth-c) + "," + div.clientHeight + "C" + div.clientWidth + "," + div.clientHeight + " " + div.clientWidth + "," + div.clientHeight + " " + div.clientWidth + "," + (div.clientHeight-c) + "L" + div.clientWidth + "," + (10+c) + "C" + div.clientWidth + ",10 " + div.clientWidth + ",10 " + (div.clientWidth-c) + ",10L" + (c+15) + ",10L" + (c-5) + ",0 z";
  }
  paper.path(path).attr({fill:"#E9967A", stroke:"#E9967A"});
  var textHeight = isUp?(div.clientHeight/2-5):(div.clientHeight/2+5);
  paper.text(div.clientWidth/2, textHeight, text).attr({"font-size":13});
  return div;
}

function dbDataMap(divId, attribute){
  return dbData[$("#"+divId)[0].attributes.getNamedItem(attribute).value];
}
function divAttrMap(divId, attribute){
  return $("#"+divId)[0].attributes.getNamedItem(attribute).value;
}
