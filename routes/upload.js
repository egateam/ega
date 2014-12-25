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

// JSON API for list of files
router.get('/files', function (req, res, next) {
    File.find({username: req.user.username}).exec(function (error, items) {
        if (error) {
            return next(error);
        }
        res.json(items);
    });
});

// JSON API for getting a single file
router.get('/files/:_id', function (req, res, next) {
    // ID comes in the URL
    File.findById(req.params._id, '', function (error, item) {
        if (error) {
            return next(error);
        }
        else if (!item) {
            res.json({error: true});
        }
        else {
            res.json(item);
        }
    });
});

// API for Delete a file
router.post('/files/delete/:_id', function (req, res, next) {
    File.findOne({"_id": req.params._id}).exec(function (error, item) {
        if (error) return next(error);
        if (!item) return next(new Error('File is not found.'));

        File.findOneAndRemove({"_id": req.params._id}, function (error) {
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
        res.redirect(303, '/upload');
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
        mkdirp(uploadDir, function (err) {
            if (err) console.error(err);
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
                                        name:      file.name,
                                        encoding:  file.encoding,
                                        mimetype:  file.mimetype,
                                        path:      newPath,
                                        realpath:  resolvedPath,
                                        extension: file.extension,
                                        size:      file.size,
                                        username:  username
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
