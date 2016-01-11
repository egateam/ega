var async    = require('async');
var util     = require("util");
var crypto   = require('crypto');
var passport = require('passport');
var User     = require('../models/User');

// mailgun mail service
var settings = require('../settings');
var mailgun  = require('mailgun-js')({apiKey: settings.mailgun.api_key, domain: settings.mailgun.domain});

/**
 * GET /login
 * Login page.
 */
exports.getLogin = function (req, res) {
    if (req.user) return res.redirect('/');
    res.render('account/login', {title: 'EGA', user: req.user, id: 'login'});
};

/**
 * POST /login
 * Sign in using email and password.
 * @param username
 * @param password
 */
exports.postLogin = function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) return next(err)
        if (!user) {
            req.flash('error', 'Username and/or Password Not Recognized.');
            return res.redirect('/login')
        }
        req.logIn(user, function (err) {
            if (err) return next(err);
            req.flash('success', 'Hi there, <strong>%s</strong>! welcome aboard.', user.username);
            return res.redirect('/');
        });
    })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = function (req, res) {
    req.logout();
    res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = function (req, res) {
    if (req.user) return res.redirect('/');
    res.render('account/signup', {
        user: req.user
    });
};

/**
 * POST /signup
 * Create a new local account.
 * @param email
 * @param password
 */
exports.postSignup = function (req, res, next) {
    var user = new User({
        username: req.body.username,
        email:    req.body.email,
        password: req.body.password
    });

    User.findOne({$or: [{username: req.body.username}, {email: req.body.email}]}, function (err, existing) {
        if (existing) {
            console.log('Account with that username/email already exists.');
            req.flash('error', 'Account with that username/email already exists.');
            return res.redirect('/signup');
        }
        user.save(function (err) {
            if (err) return next(err);
            req.logIn(user, function (err) {
                if (err) return next(err);
                req.flash('success', 'Hi, <strong>%s</strong>, welcome to EGA.', user.username);
                res.redirect('/');
            });
        });
    });
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = function (req, res) {
    res.render('account/forgot', {
        user: req.user
    });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 * @param email
 */
exports.postForgot = function (req, res, next) {
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

                user.resetPasswordToken   = token;
                user.resetPasswordExpires = Date.now() + 1000 * 3600 * 24; // 24 hours

                user.save(function (error) {
                    done(error, token, user);
                });
            });
        },
        function (token, user, done) {
            var data = {
                from:    settings.mailgun.from_who,
                to:      user.email,
                subject: 'EGA Password Reset',
                text:    'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                         'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                         'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                         'This url will be valid in next 24 hours.\n\n' +
                         'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };

            mailgun.messages().send(data, function (error, body) {
                if (error) {
                    console.log(error);
                }
                else {
                    req.flash('info', 'An e-mail has been sent to <strong>%s</strong> with further instructions.', user.email);
                    console.log("Message sent: " + body);
                }
                done(error, 'done');
            });
        }
    ], function (error) {
        if (error) return next(error);
        res.redirect('/forgot');
    });
};


/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = function (req, res) {
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function (err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
        res.render('account/reset', {
            resetUser: user.username,
            token:     req.params.token
        });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 * @param token
 */
exports.postReset = function (req, res, next) {
    User.findOne({
        resetPasswordToken: req.params.token
    }, function (error, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
        }
        console.log("Change password for [%]", user.username);

        user.password             = req.body.password;
        user.resetPasswordToken   = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function (error) {
            if (error) {
                console.log("Error occured when save password for [%]", user.username);
                return res.redirect('back');
            }
            else {
                console.log("Success: save password for [%]", user.username);
                req.flash('success', '<strong>Success!</strong> Your password has been changed.');
                res.redirect('/');
            }
        });
    });
};
