var mongoose = require('mongoose');

var fileSchema = new mongoose.Schema({
    name: {type: String, required: true},
    encoding: String,
    mimetype: String,
    path: String,
    extension: String,
    size: Number,
    realpath: {type: String, required: true}
});

module.exports = mongoose.model('File', fileSchema);
