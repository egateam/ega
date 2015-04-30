var mongoose = require('mongoose');

var shSchema = new mongoose.Schema({
    name:        String,
    exist:       Boolean,
    description: String,
    need:        String,
    path:        String,
    pid:         Number,
    startDate:   Date,
    endDate:     Date,
    exitCode:    String,
    exitSignal:  String,
    // running, failed, finished
    status:      String
});

var jobSchema = new mongoose.Schema({
    name:       {type: String, required: true},
    argument:   {
        alignName:         String,
        targetSeq:         String,
        querySeq:          [String],
        guideTree:         String,
        alignLength:       Number,
        reAlignmentMethod: String,
        selfAlignment:     Boolean,
        skipRepeatMask:    Boolean
    },
    path:       String,
    sh_files:   [shSchema],
    username:   {type: String, required: true},
    createDate: Date,
    finishDate: Date,
    // running, failed, finished
    status:     String
});

module.exports = mongoose.model('Job', jobSchema);
