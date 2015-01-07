var express = require('express');
var router = express.Router();

var fs = require("fs");
var spawn = require('child_process').spawn;
var readline = require('readline');
var _ = require('lodash');

var Job = require('../models/Job');

router.get('/', function (req, res, next) {
    var username = req.user.username;
    Job.findOne({"username": username, status: "running"}).exec(function (error, item) {
        if (error) return next(error);
        if (item) {
            res.redirect('/process/' + item._id);
        }
        else {
            res.render('process', {
                title: 'EGA Process',
                user:  req.user,
                id:    'process',
            });
        }
    });
});

router.get('/:id', function (req, res, next) {
    var username = req.user.username;
    Job.findOne({"username": username, "_id": req.params.id}).exec(function (error, item) {
        if (error) return next(error);

        fs.readdirSync(item.path).forEach(function (file, index) {
            var curPath = item.path + "/" + file;
            if (fs.lstatSync(curPath).isFile()) {
                if (/\.sh$/.test(curPath)) {
                    // Loop through sh_files
                    for (var i = 0, ln = item.sh_files.length; i < ln; i++) {
                        var sh_file = item.sh_files[i];
                        if (sh_file.name === file) {
                            console.log("find file %s", file);
                            if (!item.sh_files[i].exist) {
                                item.sh_files[i].exist = true;
                                item.sh_files[i].path = curPath;

                                item.save(function (error) {
                                    if (error) return next(error);
                                });
                                console.log("Set file %s to be existing", file);
                            }
                        }
                    }
                }
            }
        });

        res.render('process', {
            title: 'EGA Process',
            user:  req.user,
            id:    'process',
            job:   item
        });
    });
});

router.get('/:id/:filename', function (req, res, next) {
    var username = req.user.username;
    var id = req.params.id;
    var filename = req.params.filename;

    Job.findOne({username: username, "_id": id}, function (error, item) {
        if (error) {
            return next(error);
        }
        else if (!item) {
            return next(new Error('Job is not found.'));
        }
        else {
            for (var i = 0, ln = item.sh_files.length; i < ln; i++) {
                if (item.sh_files[i].name === filename) {
                    console.log("find file %s", filename);
                    process_sh(req.app.get('io'), item, i);
                    req.flash("info", "Operation <strong>[%s]</strong> starts.", filename);
                    return res.redirect('/process/' + id);
                }
            }
            req.flash("error", "Operation <strong>[%s]</strong> doesn't exist.", filename);
            return res.redirect('/process');
        }
    });
});

var process_sh = function (io, job, index) {
    var child = spawn("sh", [job.sh_files[index].path]);
    console.log('Job pid [%s].', child.pid);

    job.sh_files[index].startDate = Date.now();
    job.sh_files[index].pid = child.pid;
    job.sh_files[index].endDate = null;
    job.sh_files[index].exitCode = null;
    job.sh_files[index].exitSignal = null;
    job.sh_files[index].status = "running";

    job.save(function (error) {
        if (error) return next(error);
    });

    readline.createInterface({
        input:    child.stdout,
        terminal: false
    }).on('line', function (line) {
        var str = "[" + job.name + "] " + line + "\n";
        io.emit('news', {data: str})
    });

    readline.createInterface({
        input:    child.stderr,
        terminal: false
    }).on('line', function (line) {
        var str = "[" + job.name + "] " + line + "\n";
        io.emit('news', {data: str})
    });

    child.on('exit', function (code, signal) {
        console.log('*** closed code=%s, signal=%s', code, signal);
        io.emit('news', {data: "[Job: " + job.name + "] " + "*** CLOSED ***\n"});

        job.sh_files[index].endDate = Date.now();
        job.sh_files[index].exitCode = code;
        job.sh_files[index].exitSignal = signal;
        job.sh_files[index].status = code === 0 ? "finished" : "failed";

        job.save(function (error) {
            if (error) return next(error);
        });
        console.log('Job [%s] Operation [%s] finished and recorded', job.name, job.sh_files[index].name);
    });
};

module.exports = router;
