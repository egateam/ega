var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/User');

// Sign in using Username and Password.
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

// Login Required middleware.
exports.isLoggedIn = function(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    else {
        req.flash('error', "Only registered user can access this page. You can login with username: guest and password: password" );
        res.redirect('/login');
    }
};
