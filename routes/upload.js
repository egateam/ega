var express = require('express');
var router = express.Router();
var util = require("util");
var fs = require("fs");
var path = require("path");
var File = require('../models/File');

router.get('/', function (req, res) {
    File.find().lean().exec(function (error, files) {
        if (error) return next(error);
        res.render('upload', {
            files: files || [],
            title: 'EGA',
            user: req.user,
            id: 'upload'
        });
    });
});

router.post('/', function (req, res, next) {
    if (req.files) {
        //console.log(util.inspect(req.files));
        if (req.files.myFile.size === 0) {
            return next(new Error("Hey, first would you select a file?"));
        }
        fs.exists(req.files.myFile.path, function (exists) {
            if (exists) {
                req.flash('success', '[' + req.files.myFile.name + '] has been uploaded successfully.');
                res.redirect('/upload');
            } else {
                res.end("Well, please check your file.");
            }
        });
    }
});

router.post('/:file_id', function (req, res, next) {
    File.findOne({"_id": req.params.file_id}).exec(function (error, file) {
        if (error) return next(error);
        if (!file) return next(new Error('File is not found.'));

        console.log(util.inspect(file));

        File.findOneAndRemove({"_id": req.params.file_id}, function (error) {
            if (error) return next(error);
            console.info('Deleted file record %s with id=%s completed.', file.name, file._id);
        });

        if (fs.existsSync(file.path)) {
            fs.unlink(file.path);
            console.info('File record %s is deleted from file system.', file.path);
        }
        else {
            console.info('File record %s does not exist in file system.', file.path);
        }
        req.flash('error', '[' + file.name + '] has been deleted.');
        res.redirect(303, '/upload');
    });
});

module.exports = router;