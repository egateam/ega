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

                    var command = 'ping';
                    var args;
                    if (/^win/.test(process.platform)) {
                        args = ['-n', '30', '127.0.0.1'];
                    }
                    else {
                        args = ['-c', '30', '127.0.0.1'];
                    }

                    var jobRecord = new Job({
                        name:       alignName,
                        command:    command,
                        args:       args,
                        argument:   argument,
                        username:   username,
                        createDate: Date.now(),
                        status:     "running"
                    });
                    jobRecord.save(function (error) {
                        if (error) return next(error);
                        console.info('Added %s by %s', jobRecord.name, jobRecord.username);
                    });

                    var child = spawn(command, args);
                    console.log('Job pid [%s].', child.pid);

                    console.log("Store job to database: [%s]", req.body.alignName);
                    //Job.findOne({
                    //    username: req.user.username, name: req.body.alignName, status: "running"
                    //}).exec(function (error, job) {
                    //    if (error) return next(error);
                    //    console.log(util.inspect(job));
                    //    if (job) {
                    //        job.pid = child.pid;
                    //
                    //        job.save(function (error) {
                    //            if (error) return next(error);
                    //        });
                    //        console.log('Job pid [%s] recorded', job.pid);
                    //    }
                    //    else {
                    //        console.log('Can\'t find running job. The job is done or something errors.');
                    //    }
                    //});

                    readline.createInterface({
                        input:    child.stdout,
                        terminal: false
                    }).on('line', function (line) {
                        var str = "[" + req.body.alignName + "] " + line + "\n";
                        req.app.get('io').emit('news', {data: str})
                    });

                    readline.createInterface({
                        input:    child.stderr,
                        terminal: false
                    }).on('line', function (line) {
                        var str = "[" + req.body.alignName + "] " + line + "\n";
                        req.app.get('io').emit('news', {data: str})
                    });

                    child.on('exit', function (code, signal) {
                        console.log('*** closed code=%s, signal=%s', code, signal);
                        req.app.get('io').emit('news', {data: "[Job: " + req.body.alignName + "] " + "*** closed\n"})
                        Job.findOne({
                            username: req.user.username, "name": req.body.alignName, status: "running"
                        }, function (error, job) {
                            if (error) return next(error);
                            if (job) {
                                job.finishDate = Date.now();
                                job.exitCode = code;
                                job.exitSignal = signal;
                                job.status = code === 0 ? "finished" : "failed";

                                job.save(function (error) {
                                    if (error) return next(error);
                                });
                                console.log('Job [%s] finished and recorded', req.body.alignName);
                            }
                            else {
                                req.flash('error', 'Job error.');
                                console.log('Job error.');
                            }
                        });
                    });

                    // return is needed otherwise the page will be hanging.
                    return res.redirect(303, '/process');
                }
            });
        }
    });
});

module.exports = router;
