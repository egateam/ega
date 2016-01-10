var express  = require('express');
var router   = express.Router();
var util     = require("util");
var fs       = require("fs");
var mkdirp   = require('mkdirp');
var path     = require("path");
var multer   = require('multer');

var File     = require('../models/File');
var settings = require('../settings');

router.get('/', function (req, res) {
    res.render('upload', {
        title:    'EGA Upload',
        user:     req.user,
        id:       'upload'
    });
});

router.post('/', multer({
    dest:                 './upload/',
    changeDest:           function (dest, req, res) {
        var newDestination = dest + req.user.username;
        // make sure user directory exists
        mkdirp(newDestination, function (error) {
            if (error) console.error(error);
        });
        return newDestination;
    },
    rename:               function (fieldname, filename) {
        return filename.replace(/\W/g, '_').replace(/_+/g, '_');
    },
    limits:               {
        fileSize: settings.main.file_size_limit
    },
    onFileUploadStart:    function (file) {
        console.log(file.fieldname + ' is starting ...');
    },
    onFileUploadComplete: function (file) {
        console.log(file.fieldname + ' uploaded to  ' + file.path)
    }
}), function (req, res, next) {
    if (req.files) {
        if (req.files.myFile.size === 0) {
            return next(new Error("Hey, first would you select a file?"));
        }

        var file      = req.files.myFile;
        var username  = req.user.username;
        var uploadDir = path.join('./upload', username);

        if (!file.truncated) {
            File.findOne({name: file.name, username: username}, function (error, existing) {
                if (error) return next(error);
                if (existing) {
                    console.log('[%s] already exists!', file.name);
                    req.flash('error', '<strong>[%s]</strong> already exists!', file.name);
                    res.redirect('/upload');
                }
                else {
                    fs.realpath(file.path, function (error, resolvedPath) {
                        if (error) return next(error);

                        // save file record to mongo
                        var fileRecord = new File({
                            name:       file.name,
                            type:       '.fa/.fa.gz',
                            path:       resolvedPath,
                            size:       file.size,
                            username:   username,
                            uploadDate: Date.now()
                        });
                        fileRecord.save(function (error) {
                            if (error) return next(error);
                            console.info('Added %s by username=%s', fileRecord.name, fileRecord.username);
                        });
                        console.log('[%s] uploaded to [%s]', file.fieldname, resolvedPath);

                        fs.exists(resolvedPath, function (exists) {
                            if (exists) {
                                req.flash('success', '<strong>[%s]</strong> has been uploaded successfully.', file.name);
                                res.redirect('/upload');
                            } else {
                                res.end("Well, please check your file.");
                            }
                        });
                    });
                }
            });
        }
        else {
            fs.unlink('./' + file.path); // delete the partially written file
            console.log('[%s] exceeds size limit.', file.originalname);
            req.flash('error', '<strong>[%s]</strong> exceeds size limit.', file.name);
            res.redirect('/upload');
        }
    }
});

module.exports = router;
