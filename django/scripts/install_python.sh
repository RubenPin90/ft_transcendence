#!/bin/bash

apt install build-essential zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev libssl-dev libreadline-dev libffi-dev libsqlite3-dev wget libbz2-dev -y
wget https://www.python.org/ftp/python/3.11.3/Python-3.11.3.tgz

tar -xvf Python-3.11.3.tgz
cd Python-3.11.3

./configure --enable-optimizations
make -j 4

make altinstall