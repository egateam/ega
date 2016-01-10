var express = require('express');
var router  = express.Router();
var util    = require('util');

var Job = require('../models/Job');

router.get('/', function (req, res, next) {
    var username = req.user.username;

    Job.findOne({"username": username, status: "running"}).exec(function (error, item) {
        if (error) return next(error);

        if (item) {
            res.render('process', {
                title: 'EGA Process',
                user:  req.user,
                id:    'process',
                job:   item
            });
        }
        else {
            res.render('process', {
                title: 'EGA Process',
                user:  req.user,
                id:    'process'
            });
        }
    });
});

router.get('/:id', function (req, res, next) {
    var username = req.user.username;

    Job.findOne({"username": username, "_id": req.params.id}).exec(function (error, item) {
        if (error) return next(error);

        if (item) {
            res.render('process', {
                title: 'EGA Process',
                user:  req.user,
                id:    'process',
                job:   item
            });
        }
        else {
            res.render('process', {
                title: 'EGA Process',
                user:  req.user,
                id:    'process'
            });
        }
    });
});

module.exports = router;
