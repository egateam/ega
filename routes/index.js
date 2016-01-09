var express = require('express');
var router = express.Router();

// home page
router.get('/', function (req, res) {
    res.render('index', {title: 'EGA Home', user: req.user, id: 'home'});
});

// static pages
router.get('/contact', function (req, res) {
    res.render('contact', {title: 'contact', user: req.user, id: 'contact'});
});

router.get('/downloads', function (req, res) {
    res.render('downloads', {title: 'downloads', user: req.user, id: 'downloads'});
});

// redirect
router.get('/manual', function (req, res) {
    res.redirect('http://egateam.github.io');
});

module.exports = router;
