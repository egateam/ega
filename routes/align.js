var express = require('express');
var router = express.Router();
var util = require("util");
var File = require('../models/File');
var Job = require('../models/Job');

var spawn = require('child_process').spawn;
var readline = require('readline');
var _ = require('lodash');

router.get('/', function (req, res, next) {
    File.find({username: req.user.username}).lean().exec(function (error, files) {
        if (error) {
            console.log(error);
            return next(error);
        }
        res.render('align', {
            files: files || [],
            title: 'EGA Align',
            user:  req.user,
            id:    'align'
        });
    });
});

router.post('/', function (req, res, next) {
    console.log(util.inspect(req.body));

    ////http://stackoverflow.com/questions/19035373/redirecting-in-express-passing-some-context
    //var string = encodeURIComponent(JSON.stringify(req.body));

    var job_id = req.user.username + '-' + req.body.alignName;

    Job.findOne({status: "running"}).exec(function (error, existing) {
        if (error) return next(error);
        if (existing) {
            console.log("You have a running job [%s]!", existing.job_id);
            req.flash('error', "You have a running job <strong>[%s]</strong>!", existing.job_id);
            res.redirect('/align');
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

            var jobRecord = new Job({
                name:       req.body.alignName,
                job_id:     job_id,
                //pid:        Number,
                //path:       String,
                //realpath:   String,
                argument:   argument,
                username:   req.user.username,
                createDate: Date.now(),
                status:     "running"
            });
            jobRecord.save(function (error) {
                if (error) return next(error);
                console.info('Added %s by username=%s', jobRecord.name, jobRecord.username);
            });

            // leave router early due to unknown reasons caused hanging after submit
            res.redirect('/process');

            var child = spawn('ping', ['-n', '30', '127.0.0.1'], {
                detached: true
            });

            console.log("Store job to session: [%s]", job_id);

            readline.createInterface({
                input:    child.stdout,
                terminal: false
            }).on('line', function (line) {
                var str = "[Stdout: " + job_id + "] " + line + "\n";
                req.app.get('io').emit('news', {data: str})
            });

            readline.createInterface({
                input:    child.stderr,
                terminal: false
            }).on('line', function (line) {
                var str = "[Stderr: " + job_id + "] " + line + "\n";
                req.app.get('io').emit('news', {data: str})
            });

            child.on('close', function () {
                console.log('*** closed');
                req.app.get('io').emit('news', {data: "[Job: " + job_id + "] " + "*** closed\n"})
                Job.findOne({
                    "job_id": job_id, status: "running"
                }, function (error, job) {
                    if (!job) {
                        req.flash('error', 'Job error.');
                        return res.redirect('back');
                    }

                    job.status = "finished";
                    job.finishDate = Date.now();

                    job.save(function (error) {
                        if (error) return next(error);
                    });
                    console.log('Job [%s] finished and recorded', job.jod_id);

                    req.flash('success', "Job <strong>[%s]</strong> finished and recorded!", job.jod_id);
                });
            });
        }
    });
});

module.exports = router;
