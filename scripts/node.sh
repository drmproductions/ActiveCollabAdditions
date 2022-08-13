#!/usr/bin/env bash

docker build -q -t activecollab-additions-node -<<EOF
FROM node:17-alpine3.14
RUN npm install -g npm@8.5.0
RUN cd /opt; npm install chokidar esbuild
WORKDIR /opt/workdir
ENTRYPOINT ["node"]
EOF

shopt -s expand_aliases
alias docker-node="docker run --init -it --rm -v $PWD:/opt/workdir activecollab-additions-node "
