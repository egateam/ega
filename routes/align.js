var express = require('express');
var router = express.Router();
var util = require("util");
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
    Job.findById(req.params._id, '', function (error, item) {
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

// API for Delete a job
router.post('/jobs/delete/:_id', function (req, res, next) {
    Job.findOne({"_id": req.params._id}).exec(function (error, item) {
        if (error) return next(error);
        if (!item) return next(new Error('Job is not found.'));

        Job.findOneAndRemove({"_id": req.params._id}, function (error) {
            if (error) return next(error);
            console.info('Deleted job record %s with id=%s completed.', item.name, item._id);
        });

        //if (fs.existsSync(file.path)) {
        //    fs.unlink(file.path);
        //    console.info('File record %s is deleted from file system.', file.path);
        //}
        //else {
        //    console.info('File record %s does not exist in file system.', file.path);
        //}
        res.redirect(303, '/align');
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

                    var child = spawn(command, args);
                    console.log('Job pid [%s].', child.pid);

                    console.log("Store job to session: [%s]", job_id);
                    Job.findOne({
                        "job_id": job_id, status: "running"
                    }).exec( function (error, job) {
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

                    // return is needed otherwise the page will be hanging.
                    return res.redirect('/process');
                }
            });
        }
    });
});

module.exports = router;
