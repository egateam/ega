var mongoose = require('mongoose');

var fileSchema = new mongoose.Schema({
    name: {type: String, required: true},
    encoding: String,
    mimetype: String,
    path: {type: String, required: true},
    extension: String,
    size: Number,
    username: {type: String, required: true}
});

module.exports = mongoose.model('File', fileSchema);
