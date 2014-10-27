var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {title: 'EGA', user: req.user, id: 'home'});
});

// static pages
router.get('/about', function (req, res) {
    res.render('about', {title: 'EGA', user: req.user, id: 'about'});
});

router.get('/login', function (req, res) {
    res.render('login', {title: 'EGA', user: req.user, id: 'login'});
});


module.exports = router;
