var express = require('express');
var router = express.Router();
var util = require("util");
var fs = require("fs");
var mkdirp = require('mkdirp');
var path = require("path");

var File = require('../models/File');
var Job = require('../models/Job');

var spawn = require('child_process').spawn;
var readline = require('readline');
var _ = require('lodash');

router.get('/', function (req, res) {
    res.render('align', {
        title: 'EGA Align',
        user:  req.user,
        id:    'align'
    });
});

// JSON API for getting the running job
router.get('/running', function (req, res, next) {
    Job.findOne({username: req.user.username, status: "running"}).exec(function (error, item) {
        if (error) {
            return next(error);
        }
        else if (!item) {
            res.json(false);
        }
        else {
            res.json(item);

        }
    });
});

router.post('/', function (req, res, next) {
    console.log(util.inspect(req.body));
    var username = req.user.username;
    var alignName = req.body.alignName;

    Job.findOne({username: username, status: "running"}).exec(function (error, existing) {
        if (error) {
            return next(error);
        }
        else if (existing) {
            console.log("You have a running job [%s]!", existing.name);
            req.flash('error', "You have a running job <strong>[%s]</strong>! Go finishing it or delete it.", existing.name);
            return res.redirect('/align');
        }
        else {
            Job.findOne({username: username, name: alignName}, function (error, existing) {
                if (existing) {
                    console.log('Job with that name already exists.');
                    req.flash('error', 'Job with that name <strong>[%s]</strong> already exists in your account.', alignName);
                    return res.redirect('/align');
                }
                else {
                    console.log("Running job: [%s]", alignName);

                    var argument = {
                        alignName:         alignName,
                        targetSeq:         req.body.targetSeq,
                        querySeq:          [],
                        alignLength:       req.body.alignLength,
                        reAlignmentMethod: req.body.reAlignmentMethod
                    };

                    if (req.body.hasOwnProperty("querySeq")) {
                        if (Array.isArray(req.body.querySeq)) {
                            argument.querySeq = req.body.querySeq;
                        }
                        else {
                            argument.querySeq.push(req.body.querySeq);
                        }
                    }

                    // make sure directory exists
                    var alignDir = path.join('./upload', username, alignName);
                    mkdirp(alignDir, function (error) {
                        if (error) console.error(error);
                    });

                    alignDir = fs.realpathSync(alignDir);

                    // Only .sh files listed below can be executed
                    var sh_files = [
                        {
                            name:  'prepare.sh',
                            exist: false
                        },
                        {
                            name:  'ping.sh',
                            exist: false
                        }
                    ];

                    var sh_file = path.join(alignDir, 'prepare.sh');
                    var command = 'ping -c 30 127.0.0.1\n';
                    fs.writeFileSync(sh_file, command);

                    var jobRecord = new Job({
                        name:       alignName,
                        argument:   argument,
                        username:   username,
                        createDate: Date.now(),
                        path:       alignDir,
                        sh_files:   sh_files,
                        status:     "running"
                    });
                    jobRecord.save(function (error) {
                        if (error) return next(error);
                        console.info('Added %s by %s', jobRecord.name, jobRecord.username);
                    });

                    // return is needed otherwise the page will be hanging.
                    return res.redirect(303, '/process');
                }
            });
        }
    });
});

module.exports = router;
