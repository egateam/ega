var express = require('express');

// middleware
var favicon        = require('serve-favicon');
var logger         = require('morgan');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var cookieParser   = require('cookie-parser');
var path           = require('path');
var flash          = require('express-flash');
var session        = require('express-session');
var mongoose       = require('mongoose');
var passport       = require('passport');

var RedisStore = require('connect-redis')(session);

// app and settings
var app      = express();
var settings = require('./settings');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// static contents
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '24h',
    index:  false
}));
app.use(favicon(__dirname + '/public/favicon.ico'));

// logger, parser and flash
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(flash());

// session
app.use(cookieParser(settings.main.secret));
app.use(session({
    cookie:            {
        maxAge:   1000 * 3600 * 24 * 30, // one month in ms
        httpOnly: false
    },
    resave:            true,
    saveUninitialized: true,
    store:             new RedisStore({
        host: 'localhost',
        port: 6379,
        db:   2
        //pass: 'RedisPASS'
    }),
    secret:            settings.main.secret
}));

// passport initiation
app.use(passport.initialize());
app.use(passport.session());

// connect mongodb
mongoose.connect('mongodb://localhost:27017/ega', {server: {auto_reconnect: true}});
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));

// socket.io
var http   = require('http');
var server = http.createServer(app);
var io     = require('socket.io').listen(server);

var redis = require('socket.io-redis');
io.adapter(redis({host: 'localhost', port: 6379}));

// store information in app
app.locals.appname = 'EGA: Easy Genome Aligner';
app.set('port', settings.main.port);
app.set('io', io);
app.set('server', server);

// ----------------------------
// route section
// ----------------------------
// passport for accounts
var passportConf = require('./models/passport');

// static pages
var static_pages = require('./routes/index');
app.use('/', static_pages);

// dynamic pages
var upload  = require('./routes/upload');
var align   = require('./routes/align');
var process = require('./routes/process');
app.use('/upload', passportConf.isLoggedIn, upload);
app.use('/align', passportConf.isLoggedIn, align);
app.use('/process', passportConf.isLoggedIn, process);

// account related routers
var accountController = require('./routes/account');
app.get('/login', accountController.getLogin);
app.post('/login', accountController.postLogin);
app.get('/logout', accountController.logout);
app.get('/signup', accountController.getSignup);
app.post('/signup', accountController.postSignup);
app.get('/forgot', accountController.getForgot);
app.post('/forgot', accountController.postForgot);
app.get('/reset/:token', accountController.getReset);
app.post('/reset/:token', accountController.postReset);

// REST APIs
// "Recipes with Angular.js", page 94
// Backend Integration with Node Express
var api = require('./routes/api');

// username
app.get('/api/user', passportConf.isLoggedIn, api.user);

// Upload files
app.get('/api/files', passportConf.isLoggedIn, api.files);
app.get('/api/files/:id', passportConf.isLoggedIn, api.file);
app.put('/api/files/:id', passportConf.isLoggedIn, api.updateFile);
app.delete('/api/files/:id', passportConf.isLoggedIn, api.destroyFile);

// Aligning jobs
app.get('/api/jobs', passportConf.isLoggedIn, api.jobs);
app.get('/api/jobs/:id', passportConf.isLoggedIn, api.job);
app.put('/api/jobs/:id', passportConf.isLoggedIn, api.updateJob);
app.delete('/api/jobs/:id', passportConf.isLoggedIn, api.destroyJob);

// Process
app.get('/api/processes/:id/refresh', passportConf.isLoggedIn, api.refreshProcess); // refresh process for sh files
app.get('/api/processes/:id/finish', passportConf.isLoggedIn, api.finishProcess);
app.get('/api/processes/:id/:filename', passportConf.isLoggedIn, api.shProcess);

// result file browser
app.get('/api/dir/:id', passportConf.isLoggedIn, api.dir);

// result file downloader
app.get('/api/download/:id', passportConf.isLoggedIn, api.download);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err     = new Error('Not Found');
    err.status  = 404;
    err.request = req;
    return next(err);
});
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error:   err
    });
});

// avoid re-listening by children requiring
if (!module.parent) {
    server.listen(app.get('port'), function () {
        console.log('Express server listening on port %s', app.get('port'));
    });
}

module.exports = app;

// cloc . --exclude-dir=.git,.idea,node_modules,upload,lib --by-file
