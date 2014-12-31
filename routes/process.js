var express = require('express');
var router = express.Router();
var Job = require('../models/Job');

router.get('/', function (req, res, next) {
    var username = req.user.username;
    Job.findOne({"username": username, status: "running"}).exec(function (error, job) {
        if (error) return next(error);
        res.render('process', {
            title: 'EGA Process',
            user:  req.user,
            id:    'process',
            job:   job
        });
    });
});

router.get('/:_id', function (req, res, next) {
    var username = req.user.username;
    Job.findOne({"username": username, "_id": req.params._id}).exec(function (error, job) {
        if (error) return next(error);
        res.render('process', {
            title: 'EGA Process',
            user:  req.user,
            id:    'process',
            job:   job
        });
    });
});

module.exports = router;
