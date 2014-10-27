var express = require('express');
var router = express.Router();
var util = require("util");
var fs = require("fs");
var path = require("path");

router.get('/', function (req, res) {
    req.db.files.find().toArray(function (error, files) {
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
                req.session.flash = {
                    type: 'success',
                    message: '[' + req.files.myFile.name + '] has been uploaded successfully.'
                };
                res.redirect(303, '/upload');
            } else {
                res.end("Well, please check your file.");
            }
        });
    }
});

router.post('/:file_id', function (req, res, next) {
    req.db.files.findById(req.params.file_id, function (error, file) {
        if (error) return next(error);
        if (!file) return next(new Error('File is not found.'));
        req.db.files.removeById(file._id, function (error, count) {
            if (error) return next(error);
            if (count !== 1) return next(new Error('Something went wrong.'));
            console.info('Deleted file record %s with id=%s completed.', file.name, file._id);
        });
        if (fs.existsSync(file.path)) {
            fs.unlink(file.path);
            console.info('File record %s is deleted from file system.', file.path);
        }
        else {
            console.info('File record %s does not exist in file system.', file.path);
        }
        req.session.flash = {
            type: 'warning',
            message:  '[' + file.name + '] has been deleted.'
        };
        res.redirect(303, '/upload');
        //res.render('upload', {message: req.flash('info')});
    });
});

module.exports = router;