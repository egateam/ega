var express = require('express');
var router = express.Router();
var util = require("util");
var File = require('../models/File');

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
    console.log("Running job: [%s]", job_id);

    var child;
    if (req.session.hasOwnProperty('jobs')) {
        if (req.session.jobs.hasOwnProperty(job_id)) {
            console.log("Job is running: [%s]", job_id);
        }
        else {
            console.log("Create job: [%s]", job_id);
            child = spawn('ping', ['-n', '20', '127.0.0.1'], {
                detached: true
            });
            req.session.jobs[job_id] = child;
            console.log("Store job to session: [%s]", job_id);
        }
    }
    else {
        console.log("Create job: [%s]", job_id);
        req.session.jobs = {};
        child = spawn('ping', ['-n', '20', '127.0.0.1'], {
            detached: true
        });
        req.session.jobs[job_id] = child;
        console.log("Store job to session: [%s]", job_id);
    }

    console.log("Jobs [%s]", util.inspect(_.keys(req.session.jobs)));

    console.log("Watch job:[%s]", job_id);

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
    });

    //res.redirect('/process');
});

module.exports = router;
