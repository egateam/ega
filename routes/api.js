var fs = require("fs");

var File = require('../models/File');
var Job = require('../models/Job');

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

        item.mimetype = req.body.mimetype;

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
            console.info('Deleted job record %s with id=%s completed.', item.name, item._id);
        });

        //if (fs.existsSync(item.path)) {
        //    fs.unlink(item.path);
        //    console.info('File record %s is deleted from file system.', item.path);
        //}
        //else {
        //    console.info('File record %s does not exist in file system.', item.path);
        //}
        return res.json(true);
    });
};
