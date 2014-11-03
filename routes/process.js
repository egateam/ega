var express = require('express');
var router = express.Router();
//var util = require("util");


router.get('/', function (req, res, next) {
    //var child = require("child_process").spawn('ping', ['-n', '10', '127.0.0.1']);
    //child.stdout.pipe(res);
    res.render('process', {title: 'EGA Prosess', user: req.user, id: 'process'});
});

router.get('/:string', function (req, res, next) {
    var string = decodeURIComponent(req.params.string);
    res.render('process', {title: 'EGA Prosess', user: req.user, id: 'process', string: string});
});

module.exports = router;
