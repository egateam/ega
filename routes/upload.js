var express = require('express');
var router = express.Router();
var util = require("util");
var fs = require("fs");
var mkdirp = require('mkdirp');
var path = require("path");
var File = require('../models/File');

router.get('/', function (req, res) {
    res.render('upload', {
        title: 'EGA Upload',
        user:  req.user,
        id:    'upload'
    });
});

// Upload a file
router.post('/', function (req, res, next) {
    if (req.files) {
        if (req.files.myFile.size === 0) {
            return next(new Error("Hey, first would you select a file?"));
        }

        var file = req.files.myFile;
        var username = req.user.username;
        var uploadDir = path.join('./upload', username);

        // make sure user directory exists
        mkdirp(uploadDir, function (error) {
            if (error) console.error(error);
        });

        if (!file.truncated) {
            File.findOne({name: file.name, username: username}, function (error, existing) {
                if (error) return next(error);
                if (existing) {
                    console.log('[%s] already exists!', file.name);
                    fs.unlink('./' + file.path); // delete tmp file
                    req.flash('error', '<strong>[%s]</strong> already exists!', file.name);
                    res.redirect('/upload');
                }
                else {
                    // move file to user directory
                    // this approach can move file between disks
                    var newPath = path.join(uploadDir, file.name);
                    fs.readFile(file.path, function (error, data) {
                        fs.writeFile(newPath, data, function (error) {
                            fs.unlink(file.path, function () {
                                if (error) return next(error);

                                fs.realpath(newPath, function (error, resolvedPath) {
                                    if (error) return next(error);

                                    // save file record to mongo
                                    var fileRecord = new File({
                                        name:       file.name,
                                        type:       file.mimetype,
                                        path:       newPath,
                                        realpath:   resolvedPath,
                                        size:       file.size,
                                        username:   username,
                                        uploadDate: Date.now()
                                    });
                                    fileRecord.save(function (error) {
                                        if (error) return next(error);
                                        console.info('Added %s by username=%s', fileRecord.name, fileRecord.username);
                                    });
                                    console.log('[%s] uploaded to [%s]', file.fieldname, newPath);

                                    fs.exists(newPath, function (exists) {
                                        if (exists) {
                                            req.flash('success', '<strong>[%s]</strong> has been uploaded successfully.', file.name);
                                            res.redirect('/upload');
                                        } else {
                                            res.end("Well, please check your file.");
                                        }
                                    });
                                });
                            });
                        });
                    });
                }
            });
        }
        else {
            console.log('File exceeds size limit: ', file.originalname);
            fs.unlink('./' + file.path); // delete the partially written file
        }
    }
});

module.exports = router;
