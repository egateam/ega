var express = require('express');

// basic middlewares
var favicon = require('serve-favicon'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    fs = require("fs"),
    path = require('path'),
    multer = require("multer"),
    flash = require('express-flash')
    ;

// auth related middlewares
var session = require('express-session'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    expressValidator = require('express-validator')
    ;

// app
var app = express();
var settings = require('./settings');
app.set('port', settings.main.port);

app.locals.appname = 'EGA: Easy Genome Aligner'
app.locals.moment = require('moment');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressValidator());

// session
app.use(cookieParser(settings.main.secret));
app.use(session({
    cookie: {maxAge: 6000000},
    resave: true,
    saveUninitialized: true,
    secret: settings.main.secret
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

var passportConf = require('./models/passport');
var File = require('./models/File');

// multer uploading middleware
app.use(multer({
    dest: './upload/',
    rename: function (fieldname, filename) {
        return filename.replace(/\W+/g, '_').toLowerCase();
    },
    limits: {
        fileSize: 20 * 1024 * 1024
    },
    onFileUploadStart: function (file) {
        //TODO : apply security check : user auth, file size, number...
        console.log(file.fieldname + ' is starting ...');
    },
    onFileUploadComplete: function (file) {
        if (!file.truncated) {
            file.realpath = fs.realpathSync(file.path);
            File.findOne({name: file.name}, function (error, existing) {
                if (error) return next(error);
                if (existing) {
                    console.log(file.name + ' already exists!');
                }
                else {
                    var fileRecord = new File({
                        name: file.name,
                        encoding: file.encoding,
                        mimetype: file.mimetype,
                        path: file.path,
                        extension: file.extension,
                        size: file.size,
                        realpath: file.realpath
                    });
                    fileRecord.save(function (err) {
                        if (err) return next(err);
                        console.info('Added %s with id=%s', fileRecord.name, fileRecord._id);
                    });
                    console.log(file.fieldname + ' uploaded to  ' + file.path);
                }
            });
        }
        else {
            console.log(file.fieldname + ' is truncated');
        }
    },
    onFileSizeLimit: function (file) {
        console.log('File exceeds size limit: ', file.originalname);
        fs.unlink('./' + file.path); // delete the partially written file
    }
}));

// route section
var routes = require('./routes/index');
var upload = require('./routes/upload');
var align = require('./routes/align');
var process = require('./routes/process');

app.use('/', routes);
app.use('/upload', upload);
app.use('/align', align);
app.use('/process', process);

// connect mongodb
mongoose.connect('mongodb://localhost:27017/ega', {server: {auto_reconnect: true}});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

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

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

if (!module.parent) {
    var server = app.listen(app.get('port'), function () {
        console.log('Express server listening on port ' + server.address().port);
    });
}

module.exports = app;
