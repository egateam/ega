var express = require('express');
var router = express.Router();
//var util = require("util");


router.get('/', function (req, res) {
    //var child = require("child_process").spawn('ping', ['-n', '10', '127.0.0.1']);
    //child.stdout.pipe(res);
    res.render('process', {title: 'EGA Prosess', user: req.user, id: 'process'});
});

module.exports = router;
