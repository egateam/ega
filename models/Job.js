var mongoose = require('mongoose');

var jobSchema = new mongoose.Schema({
    name:       {type: String, required: true},
    pid:        Number,
    command:    String,
    args:       [String],
    realpath:   String,
    argument:   {
        alignName:         String,
        targetSeq:         String,
        querySeq:          [String],
        alignLength:       Number,
        reAlignmentMethod: String
    },
    username:   {type: String, required: true},
    createDate: Date,
    finishDate: Date,
    exitCode:   String,
    exitSignal: String,
    // running, failed, finished
    status:     String
});

module.exports = mongoose.model('Job', jobSchema);
