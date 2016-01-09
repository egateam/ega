#!/usr/bin/env bash

DOWNLOADDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

cd ${DOWNLOADDIR}

wget -N http://download.virtualbox.org/virtualbox/5.0.12/VirtualBox-5.0.12-104815-Win.exe
wget -N http://download.virtualbox.org/virtualbox/5.0.12/VirtualBox-5.0.12-104815-OSX.dmg
wget -N http://download.virtualbox.org/virtualbox/5.0.12/Oracle_VM_VirtualBox_Extension_Pack-5.0.12-104815.vbox-extpack

wget -N https://raw.githubusercontent.com/egateam/egavm/master/vm/Vagrantfile

wget -N https://releases.hashicorp.com/vagrant/1.8.1/vagrant_1.8.1.dmg
wget -N https://releases.hashicorp.com/vagrant/1.8.1/vagrant_1.8.1.msi
