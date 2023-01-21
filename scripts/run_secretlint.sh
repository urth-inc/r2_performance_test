#!/bin/bash

set -eu
script_dir=$(cd $(dirname $0); pwd -P)
project_dir=$(cd "$script_dir/.."; pwd -P)

cd $project_dir
docker run -v `pwd`:`pwd` -w `pwd` --rm secretlint/secretlint secretlint "**/*"
