#!/bin/sh

while ! curl google.com; do
    sleep 1
done

exit 0
