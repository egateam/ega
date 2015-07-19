# EGA: Easy Genome Aligner.

This repository is the web interface of the ega suite.

## REQUIREMENTS: Software

EGA runs under recent versions of Linux or Mac OSX.

### Web interface

EGA use [Node.js](https://nodejs.org/) as web server.

Run following commands to install global node.js packages.

```bash
npm --verbose -g install bower
```

Install server-side and client sides packages.

```bash
cd ~/path/to/ega
npm install
bower install

# start ega
node app.js # IMPORTANT! Be sure your cwd is ~/path/to/ega
```

Two database backends are also required.

* [mongodb](http://www.mongodb.org/). 
* [redis](http://redis.io/)

### [EGAZ](https://github.com/wang-q/egaz) and [EGAS](https://github.com/wang-q/egas)

* [Perl](http://www.perl.org/) 5.10.1 or higher.
	+ We suggest using [plenv](https://github.com/tokuhirom/plenv).

* Tons of Perl modules.
	+ After you setup plenv and cpanm, you could check [this script](https://github.com/wang-q/egavm/blob/master/prepare/4-cpanm.sh) for less suffering installation experiences.

* [RepeatMasker](http://www.repeatmasker.org/) and companions.
	+ [rmblast](http://www.repeatmasker.org/RMBlast.html)
	+ [trf](http://tandem.bu.edu/trf/trf.html)
	+ [Repeat database](www.girinst.org)

* Genomic aligning programs.
	+ [lastz](http://www.bx.psu.edu/~rsharris/lastz/)
	+ [multiz](http://www.bx.psu.edu/miller_lab/dist/multiz-tba.012109.tar.gz)
	+ [Jim Kent's userApp](http://hgdownload.cse.ucsc.edu/admin/exe/)
        - axtChain
        - axtSort
        - axtToMaf
        - chainAntiRepeat
        - chainMergeSort
        - chainNet
        - chainPreNet
        - chainSplit
        - chainStitchId
        - faSize
        - faToTwoBit
        - lavToPsl
        - mafSpeciesList
        - netChainSubset
        - netFilter
        - netSplit
        - netSyntenic
        - netToAxt

* Local aligning programs.
	+ [ClustalW](http://www.clustal.org/download/current/)
	+ [Mafft](http://mafft.cbrc.jp/alignment/software/)

* Phylogenetic programs.
	+ [raxml](http://sco.h-its.org/exelixis/web/software/raxml/index.html)
	+ [Newick Utilities](http://cegg.unige.ch/newick_utils)

* [NCBI blast](http://ftp.ncbi.nlm.nih.gov/blast/executables/release/LATEST/)
    + We don't use blast+.

* Other tools.
	+ [faops](https://github.com/wang-q/faops). Our own tool for manipulate fasta files.
	+ [fasops](https://github.com/wang-q/App-Fasops). Manipulate blocked fasta files.
	+ [GNU parallel](http://www.gnu.org/software/parallel/). MacOS's (BSD) `xargs` has some differences from Linux's (GNU).
	+ [circos](http://circos.ca/) for presenting paralogous parts.

## RESULTS

### Variations list

We use [vcftools](http://vcftools.sourceforge.net/index.html) and lindenb's [jvarkit](https://github.com/lindenb/jvarkit/wiki/Biostar94573)  to generate a vcf file containing substitutions and indels. 
It's just a quick and dirty results. 
If you want more accurate ones, please check another project from our team [alignDB](https://github.com/wang-q/alignDB).

## Prepare your data

You can just download sequences from NCBI's website. If you hate downloading hundreds of genomes or chromosomes manually, check [get_seq.pl](https://github.com/wang-q/withncbi/blob/master/util/get_seq.pl) and [batch_get_seq.pl](https://github.com/wang-q/withncbi/blob/master/util/batch_get_seq.pl). These scripts alse help you naming fasta files.

However, you should be cautious that these scripts depend on [bioperl](https://github.com/bioperl/bioperl-live) and [NCBI's eutils](https://github.com/bioperl/Bio-EUtilities).
