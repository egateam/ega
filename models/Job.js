var mongoose = require('mongoose');

var jobSchema = new mongoose.Schema({
    name:       {type: String, required: true},
    job_id:     {type: String, required: true},
    pid:        Number,
    path:       String,
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
    // running, failed, finished
    status:     String
});

module.exports = mongoose.model('Job', jobSchema);
