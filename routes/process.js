var express = require('express');
var router = express.Router();
var spawn = require('child_process').spawn;
var util = require("util");
var _ = require('lodash');

router.get('/', function (req, res, next) {
    console.log("Jobs [%s]", util.inspect(req.session.jobs));
    res.render('process', {title: 'EGA Prosess', user: req.user, id: 'process', jobs: _.keys(req.session.jobs)});
});

router.get('/:string', function (req, res, next) {
    var string = decodeURIComponent(req.params.string);

    res.render('process', {
        title:  'EGA Prosess',
        user:   req.user,
        id:     'process',
        string: string,
        jobs:   _.keys(req.session.jobs)
    });

});

module.exports = router;
