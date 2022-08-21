#!/usr/bin/env bash

docker build -q -t activecollab-additions-node -<<EOF
FROM node:17-alpine3.14
RUN apk add zip
RUN npm install -g npm@8.5.0
RUN cd /opt; npm install chokidar esbuild ws
WORKDIR /opt/workdir
ENTRYPOINT ["node"]
EOF

shopt -s expand_aliases
alias docker-node-pack="docker run --init -it --rm -v $PWD:/opt/workdir activecollab-additions-node "
alias docker-node-build="docker run -p 9999:9999 --init -it --rm -v $PWD:/opt/workdir activecollab-additions-node "
