var fs   = require("fs");
var path = require("path");
var _    = require('lodash');

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
                data     = _.sortBy(data, function (f) {
                    return f.name;
                });
                data     = _.sortBy(data, function (f) {
                    return !f.isDirectory;
                });
                res.json(data);
            });
        }
    });
};

exports.download = function (req, res, next) {
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
            console.log("Going to download %s", currentDir);

            var isDirectory = fs.statSync(currentDir).isDirectory();
            if (isDirectory) {
                return res.json(false);
            }
            else {
                res.download(currentDir);
            }
        }
    });
};
