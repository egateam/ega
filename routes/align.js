var express = require('express');
var router = express.Router();
var util = require("util");

var fs = require("fs");
var mkdirp = require('mkdirp');
var path = require("path");
var _ = require('lodash');

var File = require('../models/File');
var Job = require('../models/Job');

router.get('/', function (req, res) {
    res.render('align', {
        title: 'EGA Align',
        user:  req.user,
        id:    'align'
    });
});

// JSON API for getting the running job
router.get('/running', function (req, res, next) {
    Job.findOne({username: req.user.username, status: "running"}).exec(function (error, item) {
        if (error) {
            return next(error);
        }
        else if (!item) {
            res.json(false);
        }
        else {
            res.json(item);
        }
    });
});

router.post('/', function (req, res, next) {
    console.log(util.inspect(req.body));
    var username = req.user.username;
    var alignName = req.body.alignName;

    Job.findOne({username: username, status: "running"}).exec(function (error, existing) {
        if (error) {
            return next(error);
        }
        else if (existing) {
            console.log("You have a running job [%s]!", existing.name);
            req.flash('error', "You have a running job <strong>[%s]</strong>! Go finishing it or delete it.", existing.name);
            return res.redirect('/align');
        }
        else {
            Job.findOne({username: username, name: alignName}, function (error, existing) {
                if (existing) {
                    console.log('Job with that name already exists.');
                    req.flash('error', 'Job with that name <strong>[%s]</strong> already exists in your account.', alignName);
                    return res.redirect('/align');
                }
                else {
                    console.log("Running job: [%s]", alignName);

                    if (alignName == 'chr_length' || alignName == 'taxon' || alignName == 'fake_taxon' || alignName == 'seq_pair' || alignName == 'id2name') {
                        alignName += '_renamed';
                    }

                    var argument = {
                        alignName:         alignName,
                        targetSeq:         req.body.targetSeq,
                        querySeq:          [],
                        guideTree:         req.body.guideTree,
                        alignLength:       req.body.alignLength,
                        reAlignmentMethod: req.body.reAlignmentMethod,
                        selfAlignment:     false,
                        skipRepeatMask:    false
                    };

                    if (req.body.hasOwnProperty("querySeq")) {
                        if (Array.isArray(req.body.querySeq)) {
                            argument.querySeq = req.body.querySeq;
                        }
                        else {
                            argument.querySeq.push(req.body.querySeq);
                        }

                        // filter out targetSeq
                        argument.querySeq = _.filter(argument.querySeq, function (file) {
                            return file != argument.targetSeq;
                        });
                    }

                    if (req.body.selfAlignment) {
                        argument.selfAlignment = true;
                    }

                    if (req.body.skipRepeatMask) {
                        argument.skipRepeatMask = true;
                    }

                    console.log(util.inspect(argument));

                    if (!argument.selfAlignment) {
                        if (argument.querySeq.length == 0) {
                            req.flash('error', 'A multiple (non-self) aligning job should at least contain <strong>two</strong> genomes.');
                            return res.redirect('/align');
                        }
                    }

                    // make sure directory exists
                    var userDir = path.join('./upload', username);
                    userDir = fs.realpathSync(userDir);

                    var alignDir = path.join(userDir, alignName);
                    mkdirp.sync(alignDir, function (error) {
                        if (error) console.error(error);
                    });

                    // Only .sh files listed below can be executed
                    var sh_files = [
                        {
                            name:        'prepare.sh',
                            description: 'Copy files and generate rest .sh scripts.',
                            exist:       false
                        },
                        // strain_bz.pl
                        {
                            name:        '1_real_chr.sh',
                            description: 'Calculate sequence lengths.',
                            exist:       false
                        },
                        {
                            name:        '2_file_rm.sh',
                            description: 'Mask repetitive parts from sequences to make alignments more accurate.',
                            exist:       false
                        },
                        {
                            name:        '3_pair_cmd.sh',
                            description: 'Pairwise alignments with target sequence.',
                            need:        '1_real_chr.sh',
                            exist:       false
                        },
                        {
                            name:        '4_rawphylo.sh',
                            description: 'Generate a crude phylogenetic tree to guide following aligning.',
                            need:        '3_pair_cmd.sh',
                            exist:       false
                        },
                        {
                            name:        '5_multi_cmd.sh',
                            description: 'Join pairwise alignments to get multiple final alignments.',
                            need:        '3_pair_cmd.sh',
                            exist:       false
                        },
                        {
                            name:        '6_var_list.sh',
                            description: 'Generate vcf files containing substitutions and indels.',
                            need:        '5_multi_cmd.sh',
                            exist:       false
                        },
                        {
                            name:        '9_pack_it_up.sh',
                            description: 'Pack all files up as a .tar.gz compressed file.',
                            need:        '1_real_chr.sh',
                            exist:       false
                        },
                        // strain_bz_self.pl
                        {
                            name:        '3_self_cmd.sh',
                            description: 'Target sequences align with themselves.',
                            need:        '1_real_chr.sh',
                            exist:       false
                        },
                        {
                            name:        '4_proc_cmd.sh',
                            description: 'Connect genome parts based on graph theory.',
                            need:        '3_self_cmd.sh',
                            exist:       false
                        },
                        {
                            name:        '5_circos_cmd.sh',
                            description: 'Generate a circos picture presenting connections among paralogs.',
                            need:        '4_proc_cmd.sh',
                            exist:       false
                        },
                    ];

                    // sh header
                    var sh_file = path.join(alignDir, 'prepare.sh');
                    var command =
                            "#/bin/bash\n\n"
                            + "sleep 1 \n"
                            + "echo 'We are going to start...' \n"
                            + "sleep 1 \n\n";

                    // copying sequences and tree
                    command += "cd " + alignDir + "\n\n";

                    // a lot of backslash escaped chars :(
                    command += "echo 'Copy target sequence.'\n";
                    command += "gzip --stdout --decompress --force " + argument.targetSeq + " \\\n";
                    command += "    | perl -np -e \'m{^>} and m{gi\\|\\d+\\|\\w+\\|(\\w+)} and $_ = qq{>$1\\n}\' \\\n";
                    command += "    | faops split-name stdin " + strip_path(argument.targetSeq);
                    command += "\n";
                    command += "\n";

                    for (q in argument.querySeq) {
                        command += "echo 'Copy query [" + q + "] sequence.'\n";
                        command += "gzip --stdout --decompress --force " + argument.querySeq[q] + " \\\n";
                        command += "    | perl -np -e \'m{^>} and m{gi\\|\\d+\\|\\w+\\|(\\w+)} and $_ = qq{>$1\\n}\' \\\n";
                        command += "    | faops split-about stdin 10000000 " + strip_path(argument.querySeq[q]);
                        command += "\n";
                        command += "\n";
                    }

                    if (argument.guideTree) {
                        command += "echo 'Copy guide tree.'\n";
                        command += "cp " + argument.guideTree + " .";
                        command += "\n";
                        command += "\n";
                    }
                    command += "\n";

                    if (!argument.selfAlignment) {
                        command += 'perl ~/Scripts/withncbi/taxon/strain_bz.pl ' + "\\\n";
                    }
                    else {
                        command += 'perl ~/Scripts/withncbi/taxon/strain_bz_self.pl ' + "\\\n";
                    }

                    command += '    --file ' + alignDir + '/fake_taxon.csv ' + "\\\n";
                    command += '    -w ' + userDir + "\\\n";
                    command += '    --name ' + alignName + "\\\n";
                    command += '    --msa ' + argument.reAlignmentMethod + "\\\n";
                    command += '    --use_name ' + "\\\n";
                    command += '    --nostat ' + "\\\n";
                    if (argument.skipRepeatMask) {
                        command += '    --norm ' + "\\\n";
                    }
                    command += '    -t ' + strip_path(argument.targetSeq) + "\\\n";
                    for (q in argument.querySeq) {
                        command += "    -q " + strip_path(argument.querySeq[q]) + "\\\n";
                    }
                    command += '    --parallel 4 ' + "\n";

                    fs.writeFileSync(sh_file, command);

                    // fake_taxon.csv
                    var csv_file = path.join(alignDir, 'fake_taxon.csv');
                    var arbitrary = 100000000; // give them arbitrary ids
                    var content =
                            'strain,strain_id,species,species_id,genus,genus_id,family,family_id,order,order_id' + "\n";

                    arbitrary += 1;
                    content += '"' + strip_path(argument.targetSeq) + '",' + arbitrary + ',"Saccharomyces cerevisiae",4932,Saccharomyces,4930,Saccharomycetaceae,4893,Saccharomycetales,4892' + "\n";

                    for (q in argument.querySeq) {
                        arbitrary += 1;
                        content += '"' + strip_path(argument.querySeq[q]) + '",' + arbitrary + ',"Saccharomyces cerevisiae",4932,Saccharomyces,4930,Saccharomycetaceae,4893,Saccharomycetales,4892' + "\n";
                    }

                    fs.writeFileSync(csv_file, content);

                    // save job to mongo
                    var jobRecord = new Job({
                        name:       alignName,
                        argument:   argument,
                        username:   username,
                        createDate: Date.now(),
                        path:       alignDir,
                        sh_files:   sh_files,
                        status:     "running"
                    });
                    jobRecord.save(function (error) {
                        if (error) return next(error);
                        console.info('Added %s by %s', jobRecord.name, jobRecord.username);
                        // return is needed otherwise the page will be hanging.
                        return res.redirect('/process');
                    });
                }
            });
        }
    });
});

var strip_path = function (str) {
    var name = path.basename(str);
    return name.replace(/\..+$/, '');
};

module.exports = router;
