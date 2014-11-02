var express = require('express');

// basic middleware
var favicon = require('serve-favicon'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    fs = require("fs"),
    path = require('path'),
    multer = require("multer"),
    flash = require('express-flash')
    ;

// auth related middleware
var session = require('express-session'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    bcrypt = require('bcrypt-nodejs'),
    async = require('async'),
    crypto = require('crypto'),
    expressValidator = require('express-validator')
    ;

// app
var app = express();
var settings = require('./settings');
app.set('port', settings.main.port);

// connect mongodb
var mongoskin = require('mongoskin');
var db = mongoskin.db('mongodb://localhost:27017/ega?auto_reconnect', {safe: true});

// store db to req so every routes can use it
app.use(function (req, res, next) {
    req.db = {};
    req.db.files = db.collection('files');
    next();
})
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
            db.collection('files').findOne({"name": file.name}, function (error, result) {
                if (error) return next(error);
                if (result) {
                    console.log(file.name + ' already exists!');
                }
                else {
                    db.collection('files').save(file, function (error, file) {
                        if (error) return next(error);
                        if (!file) return next(new Error('Failed to save.'));
                        console.info('Added %s with id=%s', file.name, file._id);
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

// define models
mongoose.connect('mongodb://localhost:27017/ega', {safe: true});

/**
 * API keys and Passport configuration.
 */
var passportConf = require('./models/passport');

var accountRouter = require('./routes/account');

app.get('/login', accountRouter.getLogin);
app.post('/login', accountRouter.postLogin);
app.get('/logout', accountRouter.logout);
app.get('/signup', accountRouter.getSignup);
app.post('/signup', accountRouter.postSignup);
app.get('/forgot', accountRouter.getForgot);
app.post('/forgot', accountRouter.postForgot);
app.get('/reset/:token', accountRouter.getReset);
app.post('/reset/:token', accountRouter.postReset);


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
