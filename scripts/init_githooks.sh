#!/bin/bash

set -eu
script_dir=$(cd $(dirname $0); pwd -P)
project_dir=$(cd "$script_dir/.."; pwd -P)

cd $project_dir
ls -d .githooks/* | xargs -i ln -s "$project_dir/{}" .git/hooks
