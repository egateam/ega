var express = require('express');
var router = express.Router();
var util = require("util");
var fs = require("fs");
var path = require("path");

router.get('/', function (req, res) {
    req.db.files.find().toArray(function (error, files) {
        if (error) return next(error);
        res.render('align', {
            files: files || [],
            title: 'EGA',
            id: 'align'
        });
    });
});

router.post('/', function (req, res, next) {
    console.log(util.inspect(req.body));
    res.redirect('/align');
});

module.exports = router;