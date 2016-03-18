#!/usr/bin/env bash

DOWNLOADDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

wget -N -P ${DOWNLOADDIR} http://download.virtualbox.org/virtualbox/5.0.16/VirtualBox-5.0.16-105871-OSX.dmg
wget -N -P ${DOWNLOADDIR} http://download.virtualbox.org/virtualbox/5.0.16/VirtualBox-5.0.16-105871-Win.exe
wget -N -P ${DOWNLOADDIR} http://download.virtualbox.org/virtualbox/5.0.16/Oracle_VM_VirtualBox_Extension_Pack-5.0.16-105871.vbox-extpack

wget -N -P ${DOWNLOADDIR} https://raw.githubusercontent.com/egateam/egavm/master/vm/Vagrantfile

wget -N -P ${DOWNLOADDIR} https://releases.hashicorp.com/vagrant/1.8.1/vagrant_1.8.1.dmg
wget -N -P ${DOWNLOADDIR} https://releases.hashicorp.com/vagrant/1.8.1/vagrant_1.8.1.msi
