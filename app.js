var express = require('express');

var favicon = require('serve-favicon'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    fs = require("fs"),
    path = require('path'),
    multer = require("multer");
    flash = require('connect-flash')
    ;

// connect mongodb
var mongoskin = require('mongoskin');
var db = mongoskin.db('mongodb://localhost:27017/ega?auto_reconnect', {safe: true});
var app = express();

// route section
var routes = require('./routes/index');
var users = require('./routes/users');
var upload = require('./routes/upload');
var align = require('./routes/align');
var process = require('./routes/process');

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

// session
var credentials = require('./credentials.js');
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
    cookie: {maxAge: 60000},
    resave: true,
    saveUninitialized: true,
    secret: credentials.cookieSecret
}));
app.use(flash());

// if there's a flash message, transfer
// it to the context, then clear it
app.use(function(req, res, next){
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
});

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

app.use('/', routes);
app.use('/users', users);
app.use('/upload', upload);
app.use('/align', align);
app.use('/process', process);

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


module.exports = app;
