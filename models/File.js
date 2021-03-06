var mongoose = require('mongoose');

var fileSchema = new mongoose.Schema({
    name:       {type: String, required: true},
    type:       String,
    path:       {type: String, required: true},
    extension:  String,
    size:       Number,
    username:   {type: String, required: true},
    uploadDate: Date
});

module.exports = mongoose.model('File', fileSchema);
