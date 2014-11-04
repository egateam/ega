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

    // leave router early due to unknown reasons caused hanging after submit
    res.redirect('/process');

    var child = spawn('ping', ['-n', '50', '127.0.0.1'], {
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
    });

});

module.exports = router;
