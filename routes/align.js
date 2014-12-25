var express = require('express');
var router = express.Router();
var util = require("util");
var fs = require("fs");
var mkdirp = require('mkdirp');

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

// JSON API for list of jobs
router.get('/jobs', function (req, res, next) {
    Job.find({username: req.user.username}).exec(function (error, items) {
        if (error) {
            return next(error);
        }
        res.json(items);
    });
});

// JSON API for getting a single job
router.get('/jobs/:_id', function (req, res, next) {
    // ID comes in the URL
    Job.findOne({username: req.user.username, _id: req.params._id}).exec(function (error, item) {
        if (error) {
            return next(error);
        }
        else if (!item) {
            res.json({error: true});
        }
        else {
            res.json(item);
        }
    });
});

// JSON API for getting the running job
router.get('/running', function (req, res, next) {
    Job.findOne({username: req.user.username, status: "running"}).exec(function (error, item) {
        if (error) {
            return next(error);
        }
        else if (item) {
            res.json(item);
        }
        else {
            res.json({});
        }
    });
});

// API for Delete a job
router.post('/jobs/delete/:_id', function (req, res, next) {
    Job.findOne({username: req.user.username, "_id": req.params._id}).exec(function (error, item) {
        if (error) {
            return next(error);
        }
        else if (!item) {
            return next(new Error('Job is not found.'));
        }
        else {
            Job.findOneAndRemove({"_id": req.params._id}, function (error) {
                if (error) return next(error);
                console.info('Deleted job record %s with id=%s completed.', item.name, item._id);
            });
            res.redirect(303, '/align');
        }

        //if (fs.existsSync(file.path)) {
        //    fs.unlink(file.path);
        //    console.info('File record %s is deleted from file system.', file.path);
        //}
        //else {
        //    console.info('File record %s does not exist in file system.', file.path);
        //}
    });
});

router.post('/', function (req, res, next) {
    console.log(util.inspect(req.body));

    Job.findOne({username: req.user.username, status: "running"}).exec(function (error, existing) {
        if (error) return next(error);
        if (existing) {
            console.log("You have a running job [%s]!", existing.name);
            req.flash('error', "You have a running job <strong>[%s]</strong>!", existing.name);
            return res.redirect('/align');
        }
        else {
            Job.findOne({username: req.user.username, name: req.body.alignName}, function (err, existing) {
                if (existing) {
                    console.log('Job with that name already exists.');
                    req.flash('error', 'Job with that name <strong>[%s]</strong> already exists in your account.', req.body.alignName);
                    return res.redirect('/align');
                }
                else {
                    console.log("Running job: [%s]", req.body.alignName);
                    var argument = {
                        alignName:         req.body.alignName,
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

                    var command = 'ping';
                    var args;
                    if (/^win/.test(process.platform)) {
                        args = ['-n', '30', '127.0.0.1'];
                    }
                    else {
                        args = ['-c', '30', '127.0.0.1'];
                    }

                    var jobRecord = new Job({
                        name:       req.body.alignName,
                        command:    command,
                        args:       args,
                        argument:   argument,
                        username:   req.user.username,
                        createDate: Date.now(),
                        status:     "running"
                    });
                    jobRecord.save(function (error) {
                        if (error) return next(error);
                        console.info('Added %s by username=%s', jobRecord.name, jobRecord.username);
                    });

                    var child = spawn(command, args);
                    console.log('Job pid [%s].', child.pid);

                    console.log("Store job to session: [%s]", req.body.alignName);
                    Job.findOne({
                        username: req.user.username, "name": req.body.alignName, status: "running"
                    }).exec(function (error, job) {
                        if (error) return next(error);
                        console.log(util.inspect(job));
                        if (job) {
                            job.pid = child.pid;

                            job.save(function (error) {
                                if (error) return next(error);
                            });
                            console.log('Job pid [%s] recorded', job.pid);
                        }
                        else {
                            console.log('Can\'t find running job. The job is done or something errors.');
                        }
                    });

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
                    return res.redirect('/process');
                }
            });
        }
    });
});

module.exports = router;
