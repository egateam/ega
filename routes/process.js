var express = require('express');
var router = express.Router();
var util = require("util");

router.get('/', function (req, res) {
    res.render('process', {title: 'EGA', user: req.user, id: 'process'});
});

module.exports = router;
