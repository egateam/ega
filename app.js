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
    nodemailer = require('nodemailer'),
    smtpTransport = require('nodemailer-smtp-transport'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    bcrypt = require('bcrypt-nodejs'),
    async = require('async'),
    crypto = require('crypto')
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

var userSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

userSchema.pre('save', function (next) {
    var user = this;
    var SALT_FACTOR = 5;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, null, function (err, hash) {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });
});

userSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

var User = mongoose.model('User', userSchema);

passport.use(new LocalStrategy(function (username, password, done) {
    User.findOne({username: username}, function (err, user) {
        if (err) return done(err);
        if (!user) return done(null, false, {message: 'Incorrect username.'});
        user.comparePassword(password, function (err, isMatch) {
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, {message: 'Incorrect password.'});
            }
        });
    });
}));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

app.get('/login', function (req, res) {
    res.render('login', {title: 'EGA', user: req.user, id: 'login'});
});

app.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) return next(err)
        if (!user) {
            req.flash('error', 'Username and/or Password Not Recognized.');
            return res.redirect('/login')
        }
        req.logIn(user, function (err) {
            if (err) return next(err);
            req.flash('success', 'Hi there! ' + user.username + ', welcome aboard.');
            return res.redirect('/');
        });
    })(req, res, next);
});

app.get('/signup', function (req, res) {
    res.render('signup', {
        user: req.user
    });
});

app.post('/signup', function (req, res) {
    var user = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
    });

    user.save(function (err) {
        req.logIn(user, function (err) {
            res.redirect('/');
        });
    });
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/forgot', function (req, res) {
    res.render('forgot', {
        user: req.user
    });
});

app.post('/forgot', function (req, res, next) {
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (error, buf) {
                var token = buf.toString('hex');
                done(error, token);
            });
        },
        function (token, done) {
            User.findOne({email: req.body.email}, function (error, user) {
                if (!user) {
                    req.flash('error', 'No account with that email address exists.');
                    return res.redirect('/forgot');
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save(function (error) {
                    done(error, token, user);
                });
            });
        },
        function (token, user, done) {
            var transporter = nodemailer.createTransport(smtpTransport({
                host: settings.sendmail.host,
                auth: {
                    user: settings.sendmail.user,
                    pass: settings.sendmail.pass
                },
                secure: false,
                tls: {rejectUnauthorized: false},
                debug: true
            }));
            var mailOptions = {
                to: user.email,
                from: 'noreply passwordreset@demo.com',
                subject: 'EGA Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            transporter.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log(error);
                } else {
                    req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                    console.log("Message sent: " + response.message);
                }
                done(error, 'done');
            });
        }
    ], function (error) {
        if (error) return next(error);
        res.redirect('/forgot');
    });
});

app.get('/reset/:token', function (req, res) {
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function (err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
        res.render('reset', {
            user: req.user
        });
    });
});

app.post('/reset/:token', function (req, res, next) {
    async.waterfall([
        function (done) {
            User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: {$gt: Date.now()}
            }, function (error, user) {
                if (!user) {
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('back');
                }

                user.password = req.body.password;
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function (error) {
                    req.logIn(user, function (error) {
                        done(error, user);
                    });
                });
            });
        },
        function (user, done) {
            req.flash('success', 'Success! Your password has been changed.');
            done(null, 'done');
        }
    ], function (error) {
        res.redirect('/');
    });
});

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
