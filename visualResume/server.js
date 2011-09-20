var express = require('express'),
    ejs = require('ejs'),
    config = require('./config'),
    visualResume = require('./controllers/visualResume');

var app = express.createServer();
app.use(express.static(__dirname + '/public', {maxAge: 3600000 * 24 * 30}));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({
    secret: config.session_secret
}));
app.helpers({
    config: config
});

/**
 * Views settings
 */
app.set("view engine", "html");
app.set("views", __dirname + '/views');
app.register("html", ejs);

/**
 * Routing
 */
app.get('/info/:template/:userName', visualResume.index);
app.get('/resume/:template/:resume', visualResume.showResume);
app.post('/saveData', visualResume.saveData);

app.listen(config.port);
console.log('Server start http://localhost:' + config.port);

