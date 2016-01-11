var fs   = require("fs");
var path = require("path");
var util = require('util');
var _    = require('lodash');

var spawn    = require('child_process').spawn;
var readline = require('readline');
var running  = require('is-running');

var File = require('../models/File');
var Job  = require('../models/Job');

exports.user = function (req, res, next) {
    return res.json(req.user);
};

// API for files
exports.files = function (req, res, next) {
    File.find({username: req.user.username}, function (error, items) {
        if (error) {
            return next(error);
        }
        res.json(items)
    });
};

exports.file = function (req, res, next) {
    File.findOne({username: req.user.username, _id: req.params.id}, function (error, item) {
        if (error) {
            return next(error);
        }
        else if (!item) {
            return res.json(false);
        }
        else {
            res.json(item);
        }
    });
};

exports.updateFile = function (req, res, next) {
    File.findOne({username: req.user.username, "_id": req.params.id}, function (error, item) {
        if (error) return next(error);
        if (!item) return next(new Error('File is not found.'));

        item.type = req.body.type;

        item.save(function (error) {
            if (error) return next(error);
            return res.json(true);
        });
    });
};

exports.destroyFile = function (req, res, next) {
    File.findOne({username: req.user.username, "_id": req.params.id}, function (error, item) {
        if (error) return next(error);
        if (!item) return next(new Error('File is not found.'));

        File.findOneAndRemove({"_id": item._id}, function (error) {
            if (error) return next(error);
            console.info('Deleted file record %s with id=%s completed.', item.name, item._id);
        });

        if (fs.existsSync(item.path)) {
            fs.unlink(item.path);
            console.info('File record %s is deleted from file system.', item.path);
        }
        else {
            console.info('File record %s does not exist in file system.', item.path);
        }
        return res.json(true);
    });
};

// API for jobs
exports.jobs = function (req, res, next) {
    Job.find({username: req.user.username}, function (error, items) {
        if (error) {
            return next(error);
        }
        res.json(items)
    });
};

exports.job = function (req, res, next) {
    Job.findOne({username: req.user.username, _id: req.params.id}, function (error, item) {
        if (error) {
            return next(error);
        }
        else if (!item) {
            return res.json(false);
        }
        else {
            res.json(item);
        }
    });
};

exports.updateJob = function (req, res, next) {
    Job.findOne({username: req.user.username, "_id": req.params.id}, function (error, item) {
        if (error) return next(error);
        if (!item) return next(new Error('Job is not found.'));

        //item.mimetype = req.body.mimetype;

        item.save(function (error) {
            if (error) return next(error);
            return res.json(true);
        });
    });
};

exports.destroyJob = function (req, res, next) {
    Job.findOne({username: req.user.username, "_id": req.params.id}, function (error, item) {
        if (error) return next(error);
        if (!item) return next(new Error('Job is not found.'));

        Job.findOneAndRemove({"_id": item._id}, function (error) {
            if (error) return next(error);
            if (fs.existsSync(item.path)) {
                deleteFolderRecursive(item.path);
                console.info('Job record [%s] is deleted from file system.', item.path);
            }
            else {
                console.info('Job record [%s] does not exist in file system.', item.path);
            }
        });

        return res.json(true);
    });
};

exports.refreshProcess = function (req, res, next) {
    Job.findOne({username: req.user.username, "_id": req.params.id}, function (error, item) {
        if (error) return next(error);
        if (!item) return next(new Error('Job is not found.'));

        // Mark disappeared operation as failed
        for (var i = 0, ln = item.sh_files.length; i < ln; i++) {
            if (item.sh_files[i].status === "running") {
                var pid  = item.sh_files[i].pid;
                var live = running(pid);
                if (!live) {
                    Job.update({"_id": req.params.id, 'sh_files._id': item.sh_files[i]._id},
                        {
                            '$set': {
                                'sh_files.$.status': "failed"
                            }
                        }, function (error) {
                            if (error) {
                                console.log("Saving status errors for [%s]", item.name);
                                return next(error);
                            }
                        });
                    console.log("Set disappeared operation [%s] to be failed", item.sh_files[i].name);
                }
            }
        }

        // Match existing sh files
        fs.readdir(item.path, function (error, files) {
            if (error) return next(error);

            files.forEach(function (file) {
                var curPath = path.join(item.path, file);
                if (fs.lstatSync(curPath).isFile()) {
                    if (/\.sh$/.test(curPath)) {
                        // Loop through sh_files
                        for (var i = 0, ln = item.sh_files.length; i < ln; i++) {
                            if (item.sh_files[i].name === file) {
                                if (!item.sh_files[i].exist) {
                                    Job.update({"_id": req.params.id, 'sh_files._id': item.sh_files[i]._id},
                                        {
                                            '$set': {
                                                'sh_files.$.exist': true,
                                                'sh_files.$.path':  curPath
                                            }
                                        }, function (error) {
                                            if (error) {
                                                console.log("Saving path errors for [%s]", item.name);
                                                return next(error);
                                            }
                                        });
                                    console.log("Set file %s to be existing", file);
                                }

                            }
                        }
                    }
                }
            });
            Job.findOne({username: req.user.username, "_id": req.params.id}, function (error, item) {
                if (error) return next(error);
                if (!item) return next(new Error('Job is not found.'));

                // return updated job
                return res.json(item);
            });
        });
    });
};

exports.finishProcess = function (req, res, next) {
    Job.findOne({username: req.user.username, "_id": req.params.id}, function (error, item) {
        if (error) return next(error);
        if (!item) return next(new Error('Job is not found.'));

        item.status     = 'finished';
        item.finishDate = Date.now();

        item.save(function (error) {
            if (error) return next(error);
        });
        console.log("Mark job [%s] as finished!", item.name);

        return res.json(item);
    });
};

exports.shProcess = function (req, res, next) {
    Job.findOne({username: req.user.username, "_id": req.params.id}, function (error, item) {
        if (error) return next(error);
        if (!item) return next(new Error('Job is not found.'));

        if (item.status !== 'running') return next(new Error('Job is not in running mode.'));

        var username = req.user.username;
        var filename = req.params.filename;
        console.log("User request to execute [%s].", filename);

        for (var i = 0, ln = item.sh_files.length; i < ln; i++) {
            if (item.sh_files[i].name === filename) {
                var this_step = item.sh_files[i];
                console.log("find file %s", this_step.name);
                console.log(util.inspect(this_step));

                try {
                    process_sh(req.app.get('io'), username, item, i, next);
                }
                catch (exception) {
                    console.log(util.inspect(exception));
                }
            }
        }

        return res.json(item);
    });
};

var process_sh = function (io, username, job, index, next) {
    var child = spawn("bash", [job.sh_files[index].path]);
    console.log('Job pid [%s].', child.pid);

    job.sh_files[index].startDate  = Date.now();
    job.sh_files[index].pid        = child.pid;
    job.sh_files[index].endDate    = null;
    job.sh_files[index].exitCode   = null;
    job.sh_files[index].exitSignal = null;
    job.sh_files[index].status     = "running";

    job.save(function (error) {
        if (error) return next(error);
    });

    // messages to channel username
    readline.createInterface({
        input:    child.stdout,
        terminal: false
    }).on('line', function (line) {
        var str = "[stdout] " + line + "\n";
        io.emit(username, {data: str})
    });

    readline.createInterface({
        input:    child.stderr,
        terminal: false
    }).on('line', function (line) {
        var str = "[stderr] " + line + "\n";
        io.emit(username, {data: str})
    });

    child.on('exit', function (code, signal) {
        console.log('*** closed code=%s, signal=%s', code, signal);

        job.sh_files[index].endDate    = Date.now();
        job.sh_files[index].exitCode   = code;
        job.sh_files[index].exitSignal = signal;
        job.sh_files[index].status     = code === 0 ? "finished" : "failed";

        job.save(function (error) {
            if (error) return next(error);
        });
        console.log('Job [%s] Operation [%s] finished and recorded', job.name, job.sh_files[index].name);
        io.emit(username, {data: "[Job: " + job.name + "] [Operation: " + job.sh_files[index].name + "] " + "*** DONE ***\n"});
        io.emit(username + '-done', job);
    });
};

// Codes come from
// http://www.geedew.com/2012/10/24/remove-a-directory-that-is-not-empty-in-nodejs/
var deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

// list dirs and files inside user jobs
//https://chawlasumit.wordpress.com/2014/08/04/how-to-create-a-web-based-file-browser-using-nodejs-express-and-jquery-datatables/
//https://github.com/sumitchawla/file-browser
exports.dir = function (req, res, next) {
    Job.findOne({username: req.user.username, _id: req.params.id}, function (error, item) {
        if (error) {
            return next(error);
        }
        else if (!item) {
            return res.json(false);
        }
        else {
            var currentDir = item.path;
            var query      = req.query.path || '';
            if (query) currentDir = path.join(currentDir, query);
            console.log("browsing ", currentDir);
            fs.readdir(currentDir, function (error, files) {
                if (error) {
                    return next(error);
                }
                var data = [];
                files.filter(function (file) {
                    // filter out hidden files
                    return !(/(^|.\/)\.+[^\/\.]/g).test(file);
                }).forEach(function (file) {
                    try {
                        var isDirectory = fs.statSync(path.join(currentDir, file)).isDirectory();
                        if (isDirectory) {
                            data.push({
                                name:        file,
                                isDirectory: true,
                                path:        path.join(query, file)
                            });
                        } else {
                            // filter out all .sh files
                            var ext = path.extname(file);
                            if (_.contains([".sh", ".2bit", ".bat"], ext)) {
                                console.log("excluding file ", file);
                                return;
                            }

                            // filter out files user shouldn't see
                            if (_.contains(["chr_length.csv", "id2name.csv", "taxon.csv", "fake_taxon.csv", "fake_tree.nwk"], file)) {
                                console.log("excluding file ", file);
                                return;
                            }

                            data.push({
                                name:        file,
                                ext:         ext,
                                isDirectory: false,
                                path:        path.join(query, file)
                            });
                        }

                    } catch (e) {
                        console.log(e);
                    }

                });
                data = _.sortBy(data, function (f) {
                    return f.name;
                });
                data = _.sortBy(data, function (f) {
                    return !f.isDirectory;
                });
                res.json(data);
            });
        }
    });
};

exports.download = function (req, res, next) {
    Job.findOne({username: req.user.username, _id: req.params.id}, function (error, item) {
        if (error) return next(error);
        if (!item)  return res.json(false);

        var currentDir = item.path;
        var query      = req.query.path || '';
        if (query) currentDir = path.join(currentDir, query);
        console.log("Going to download %s", currentDir);

        var isDirectory = fs.statSync(currentDir).isDirectory();
        if (isDirectory) {
            return res.json(false);
        }
        else {
            res.download(currentDir);
        }
    });
};
