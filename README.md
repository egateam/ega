# EGA: Easy Genome Aligner.

This repository is the web interface of the ega suite.

## REQUIREMENTS: Software

EGA runs under recent versions of Linux or Mac OSX.

### Web interface

EGA use [Node.js](https://nodejs.org/) as web server.

Two database backends are also required.

* [mongodb](http://www.mongodb.org/). 
* [redis](http://redis.io/)

Run following commands run ega.

```bash
cd ~/path/to/ega

# Install server-side packages
npm --verbose -g install bower
npm install

# and client sides packages
bower install

# settings
cp seetings.js.example settings.js

# start ega
node app.js # IMPORTANT! Be sure your cwd is ~/path/to/ega
```

### Major components: [egaz](https://github.com/wang-q/egaz) and [egas](https://github.com/wang-q/egas)

* [Perl](http://www.perl.org/) 5.10.1 or higher.
    * We suggest using [plenv](https://github.com/tokuhirom/plenv).

* Tons of Perl modules.
    * After you setup `plenv` and `cpanm`, you could check [this script](https://github.com/wang-q/egavm/blob/master/prepare/4-cpanm.sh) for less suffering installation experiences.

* [RepeatMasker](http://www.repeatmasker.org/) and companions.
    * [rmblast](http://www.repeatmasker.org/RMBlast.html)
    * [trf](http://tandem.bu.edu/trf/trf.html)
    * [Repeat database](www.girinst.org)

* Genomic aligning programs.
    * [lastz](http://www.bx.psu.edu/~rsharris/lastz/)
    * [multiz](http://www.bx.psu.edu/miller_lab/dist/multiz-tba.012109.tar.gz)
        * We use [a modified version](https://github.com/wang-q/multiz) supporting gzipped files.
    * [Jim Kent's userApp](http://hgdownload.cse.ucsc.edu/admin/exe/)
        * axtChain
        * axtSort
        * axtToMaf
        * chainAntiRepeat
        * chainMergeSort
        * chainNet
        * chainPreNet
        * chainSplit
        * chainStitchId
        * faSize
        * faToTwoBit
        * lavToPsl
        * netChainSubset
        * netFilter
        * netSplit
        * netSyntenic
        * netToAxt

* Local aligning programs.
    * [ClustalW](http://www.clustal.org/download/current/)
    * [Mafft](http://mafft.cbrc.jp/alignment/software/)

* Phylogenetic programs.
    * [raxml](http://sco.h-its.org/exelixis/web/software/raxml/index.html)
    * [Newick Utilities](http://cegg.unige.ch/newick_utils)

* [NCBI blast+](http://ftp.ncbi.nlm.nih.gov/blast/executables/blast+/LATEST/)

* Other tools.
    * [faops](https://github.com/wang-q/faops). Our own tool for manipulate fasta files.
    * [fasops](https://github.com/wang-q/App-Fasops). Manipulate blocked fasta files.
    * [runlist](https://github.com/wang-q/App-RL). Chromosome coverages.
    * [sparseMEM](http://compbio.cs.princeton.edu/mems/). Finding exact matches in genome.
    * [GNU parallel](http://www.gnu.org/software/parallel/). MacOS's (BSD) `xargs` has some differences from Linux's (GNU).
    * [circos](http://circos.ca/) for presenting paralogous parts.

## Prepare your data

### Download fasta sequences from NCBI's website. 

There are plenty of tutorials available in the web, such as [this one](https://www.youtube.com/watch?v=qtXf4DstQDU). 

### Download with NCBI etuils

NCBI's eutils provide an easy way to download sequences from command line.

```bash
wget "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=NC_000913&rettype=fasta" -nc -O Ecoli_K_12.fa
wget "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=NC_011750&rettype=fasta" -nc -O Ecoli_IAI39.fa
wget "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=NC_018658&rettype=fasta" -nc -O Ecoli_O104_H4.fa
wget "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=NC_002695&rettype=fasta" -nc -O Ecoli_O157_H7.fa
wget "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=NC_017634&rettype=fasta" -nc -O Ecoli_O83_H1.fa
wget "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=NC_011751&rettype=fasta" -nc -O Ecoli_UMN026.fa
```

### More complex command lines

For example, you want all genomes of [*Bacillus subtilis*](http://www.ncbi.nlm.nih.gov/genome/genomes/665) at chromosome level. 

Current (Jan. 2016) number of genomes is 37. But *Bacillus subtilis* subsp. subtilis str. 168 occured three times, so there will be 35 files.

```bash
mkdir -p ~/Bsub
cd ~/Bsub

wget -O - 'http://www.ncbi.nlm.nih.gov/genomes/Genome2BE/genome2srv.cgi?action=download&orgn=Bacillus%20subtilis[orgn]&status=50|40|&report=proks&group=--%20All%20Prokaryotes%20--&subgroup=--%20All%20Prokaryotes%20--&format=' \
    | grep -v '^#' \
    | cut -f2,11 \
    | perl -na -F"\t" -e '
    $F[0] =~ s/\W+/_/g;
    $F[1] =~ /chromosome:([\w_]+)/;
    printf q{wget "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=%s&rettype=fasta" -nc -O Bsub_%s.fa}, $1, $F[0];
    print qq{\n};
    ' \
    > download.sh
    
bash download.sh

find . -type f -name "*.fa" | xargs gzip
find . -type f -name "*.fa.gz" | wc -l
```

### Download with helper scripts

If you hate downloading hundreds of genomes or chromosomes manually, 
check [get_seq.pl](https://github.com/wang-q/withncbi/blob/master/taxon/get_seq.pl) 
and [batch_get_seq.pl](https://github.com/wang-q/withncbi/blob/master/taxon/batch_get_seq.pl). 
These scripts alse help you naming fasta files.

However, you should be cautious that these scripts depend on [bioperl](https://github.com/bioperl/bioperl-live)
and [Bio::EUtilities](https://github.com/bioperl/Bio-EUtilities).

## RESULTS

### Variations list

We use [vcftools](http://vcftools.sourceforge.net/index.html) and lindenb's [jvarkit](https://github.com/lindenb/jvarkit/wiki/Biostar94573)  
to generate a vcf file containing substitutions and indels. 
It's just a quick and dirty results.

If you want more accurate ones, please check another project from our team [alignDB](https://github.com/wang-q/alignDB).
