var express = require('express');
var router = express.Router();
var util = require("util");

router.get('/', function (req, res) {
    req.db.files.find().toArray(function (error, files) {
        if (error) return next(error);
        res.render('align', {
            files: files || [],
            title: 'EGA',
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