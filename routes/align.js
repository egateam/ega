var express = require('express');
var router = express.Router();
var util = require("util");
var File = require('../models/File');
var Job = require('../models/Job');

var spawn = require('child_process').spawn;
var readline = require('readline');
var _ = require('lodash');

router.get('/', function (req, res, next) {
    var username = req.user.username;
    File.find({username: username}).lean().exec(function (error, files) {
        if (error) return next(error);
        Job.find({"username": username}).lean().exec(function (error, all) {
            if (error) return next(error);
            res.render('align', {
                files:   files || [],
                title:   'EGA Align',
                user:    req.user,
                id:      'align',
                allJobs: all || []
            });
        });
    });
});

router.post('/', function (req, res, next) {
    console.log(util.inspect(req.body));

    ////http://stackoverflow.com/questions/19035373/redirecting-in-express-passing-some-context
    //var string = encodeURIComponent(JSON.stringify(req.body));

    Job.findOne({status: "running"}).exec(function (error, existing) {
        if (error) return next(error);
        if (existing) {
            console.log("You have a running job [%s]!", existing.job_id);
            req.flash('error', "You have a running job <strong>[%s]</strong>!", existing.job_id);
            return res.redirect('/align');
        }
        else {
            var job_id = req.user.username + '-' + req.body.alignName;

            Job.findOne({job_id: job_id}, function (err, existing) {
                if (existing) {
                    console.log('Job with that name already exists.');
                    req.flash('error', 'Job with that name <strong>[%s]</strong> already exists in your account.', req.body.alignName);
                    return res.redirect('/align');
                }
                else {
                    console.log("Running job: [%s]", job_id);
                    var argument = {
                        alignName:         req.body.alignName,
                        targetSeq:         req.body.targetSeq,
                        querySeq:          [],
                        alignLength:       req.body.alignLength,
                        reAlignmentMethod: req.body.reAlignmentMethod,
                    };

                    if (Array.isArray(req.body.querySeq)) {
                        argument.querySeq = req.body.querySeq;
                    }
                    else {
                        argument.querySeq.push(req.body.querySeq);
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
                        job_id:     job_id,
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

                    // redirect early due to unknown reasons caused hanging after submit
                    // rest codes will still be executed
                    res.redirect('/process');

                    var child = spawn(command, args);
                    console.log('Job pid [%s].', child.pid);

                    console.log("Store job to session: [%s]", job_id);
                    Job.findOne({
                        "job_id": job_id, status: "running"
                    }, function (error, job) {
                        if (error) return next(error);
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
                        var str = "[Stdout: " + req.body.alignName + "] " + line + "\n";
                        req.app.get('io').emit('news', {data: str})
                    });

                    readline.createInterface({
                        input:    child.stderr,
                        terminal: false
                    }).on('line', function (line) {
                        var str = "[Stderr: " + req.body.alignName + "] " + line + "\n";
                        req.app.get('io').emit('news', {data: str})
                    });

                    child.on('exit', function (code, signal) {
                        console.log('*** closed code=%s, signal=%s', code, signal);
                        req.app.get('io').emit('news', {data: "[Job: " + req.body.alignName + "] " + "*** closed\n"})
                        Job.findOne({
                            "job_id": job_id, status: "running"
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
                                console.log('Job [%s] finished and recorded', job_id);
                            }
                            else {
                                req.flash('error', 'Job error.');
                                console.log('Job error.');
                            }
                        });
                    });
                }
            });
        }
    });
});

module.exports = router;
