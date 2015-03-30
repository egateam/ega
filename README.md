# EGA

Easy Genome Aligner.

This repository is the web interface of the ega suite.

## REQUIREMENTS: Software

EGA runs under Linux or Mac OSX.

### Web interface

EGA use [Node.js](https://nodejs.org/) as web server.

Run following commands to install global node.js packages.

* npm --verbose -g install express-generator
* npm --verbose -g install nodemon
* npm --verbose -g install bower

Run following commands to install server-side and client sides packages.

* npm install
* bower install

These three databases are also required.

* [mongodb](http://www.mongodb.org/)
* [redis](http://redis.io/)
* [mysql](http://www.mysql.com/)


### [EGAZ](https://github.com/wang-q/egaz) and [EGAS](https://github.com/wang-q/egas)

* [Perl](http://www.perl.org/) 5.10.1 or higher.
	* We suggest using [plenv](https://github.com/tokuhirom/plenv).
* Tons of Perl modules.
	* Install all modules listed in [this page](https://stratopan.com/wangq/alignDB/master). (We are not kidding.)
	* After you setup plenv and minicpan, you cound check [this page](https://github.com/wang-q/tool/blob/master/stpan.txt) for less suffering experiences.
* [RepeatMasker](http://www.repeatmasker.org/) and companions.
	* [rmblast](http://www.repeatmasker.org/RMBlast.html)
	* [trf](http://tandem.bu.edu/trf/trf.html)
	* [Repeat databse](www.girinst.org)
* Genomic aligning programs.
	* [lastz](http://www.bx.psu.edu/~rsharris/lastz/)
	* [multiz](http://www.bx.psu.edu/miller_lab/dist/multiz-tba.012109.tar.gz)
	* [kent userApp](http://hgdownload.cse.ucsc.edu/admin/exe/)
* Local aligning programs.
	* [ClustalW](http://www.clustal.org/download/current/)
	* [Mafft](http://mafft.cbrc.jp/alignment/software/)
* Phylogenetic programs.
	* [raxml](http://sco.h-its.org/exelixis/web/software/raxml/index.html)
* [NCBI blast](ftp://ftp.ncbi.nlm.nih.gov/blast/executables/release/LATEST/)
* Other tools.
	* [faops](https://github.com/wang-q/faops)
	* [GNU parallel](http://www.gnu.org/software/parallel/)
	* [circos](http://circos.ca/)


