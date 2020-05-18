#!/bin/sh

while ! grep -q /net/somenode/somedir </proc/mounts; do
  sleep 1
done

exit 0
