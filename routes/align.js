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

    //http://stackoverflow.com/questions/19035373/redirecting-in-express-passing-some-context
    var string = encodeURIComponent(JSON.stringify(req.body));
    res.redirect(303, '/process/' + string);
});

module.exports = router;
