#!/usr/bin/env -S bash -e

cd ..
rm -f ActiveCollabAdditions.zip
zip -r ActiveCollabAdditions.zip ActiveCollabAdditions \
  -x ActiveCollabAdditions/.git/\* \
  -x ActiveCollabAdditions/out/\*
