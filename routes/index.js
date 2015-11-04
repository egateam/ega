var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {title: 'EGA Home', user: req.user, id: 'home'});
});

// static pages
router.get('/contact', function (req, res) {
    res.render('contact', {title: 'contact', user: req.user, id: 'contact'});
});

// redirect
router.get('/manual', function (req, res) {
    res.redirect('http://egateam.github.io');
});

module.exports = router;
