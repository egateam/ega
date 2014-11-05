var express = require('express');
var router = express.Router();
var util = require("util");
var _ = require('lodash');
var Job = require('../models/Job');

router.get('/', function (req, res, next) {
    Job.find({username: req.user.username}).lean().exec(function (error, all) {
        Job.findOne({"username": req.user.username, status: "running"}).exec(function (error, job) {
            if (error) return next(error);
            res.render('process', {
                title:   'EGA Prosess',
                user:    req.user,
                id:      'process',
                job:     job ? JSON.stringify(job) : '',
                allJobs: all || []
            });
        });
    });
});

//router.get('/:string', function (req, res, next) {
//    var string = decodeURIComponent(req.params.string);
//
//    res.render('process', {
//        title:  'EGA Prosess',
//        user:   req.user,
//        id:     'process',
//        string: string,
//        jobs:   _.keys(req.session.jobs)
//    });
//});

module.exports = router;
