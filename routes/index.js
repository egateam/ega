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

// static pages
router.get('/tutorial', function (req, res) {
    res.render('tutorial', {title: 'EGA Tutorial', user: req.user, id: 'tutorial'});
});

module.exports = router;
