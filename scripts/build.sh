#!/usr/bin/env -S bash -e

. scripts/node.sh

docker-node scripts/build.js $1

# fix permissions (in case you have to run docker as root)
chown "$(stat -c '%U:%G' .)" -R www
