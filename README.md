# Packaging

Packaging has only been tested on GNU/Linux. Feel free to submit a pull request with build scripts for other platforms!

## Requirements

- bash
- docker
- zip

## Packaging for Chromium

`./scripts/build.sh build && ./scripts/pack.sh chromium`

The archive will be located in `out/chromium/`

## Packaging for Firefox

`./scripts/build.sh build && ./scripts/pack.sh firefox`

The archive will be located in `out/firefox/`

## Archiving source code for Firefox Add-on Developer Hub

`./scripts/pack-source-code.sh`
