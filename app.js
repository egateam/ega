var express = require('express');

var favicon = require('serve-favicon'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    path = require('path'),
    multer = require('multer'),
    fs = require("fs")
    ;

var mongoskin = require('mongoskin');
var db = mongoskin.db('mongodb://localhost:27017/ega?auto_reconnect', {safe: true});
var app = express();

var routes = require('./routes/index');
var users = require('./routes/users');
var upload = require('./routes/upload');
var align = require('./routes/align');

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
            db.collection('files').save(file, function (error, file) {
                if (error) return next(error);
                if (!file) return next(new Error('Failed to save.'));
                console.info('Added %s with id=%s', file.name, file._id);
            });
            console.log(file.fieldname + ' uploaded to  ' + file.path);
        }
        else {
            console.log(file.fieldname + ' is truncated');
        }
    },
    onFileSizeLimit: function (file) {
        console.log('Failed: ', file.originalname);
        fs.unlink('./' + file.path); // delete the partially written file
    }
}));

app.use('/', routes);
app.use('/users', users);
app.use('/upload', upload);
app.use('/align', align);

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
