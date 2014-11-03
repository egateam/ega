var express = require('express');
var router = express.Router();
var util = require("util");
var File = require('../models/File');

router.get('/', function (req, res, next) {
    File.find({username: req.user.username}).lean().exec(function (error, files) {
        if (error) {
            console.log(error);
            return next(error);
        }
        res.render('align', {
            files: files || [],
            title: 'EGA Align',
            user: req.user,
            id: 'align'
        });
    });
});

router.post('/', function (req, res, next) {
    console.log(util.inspect(req.body));
    req.flash('info', "Start aligning with your parameters: " + JSON.stringify(req.body));
    res.redirect(303, '/process');
});

module.exports = router;
