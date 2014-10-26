var express = require('express');
var router = express.Router();
/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {title: 'EGA', id: 'home'});
});

router.get('/about', function (req, res) {
    res.render('about', {title: 'EGA', id: 'about'});
});

router.get('/login', function (req, res) {
    res.render('login', {title: 'EGA', id: 'login'});
});


module.exports = router;
