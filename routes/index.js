var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {title: 'EGA Home', user: req.user, id: 'home'});
});

// static pages
router.get('/about', function (req, res) {
    res.render('about', {title: 'EGA About', user: req.user, id: 'about'});
});

module.exports = router;
