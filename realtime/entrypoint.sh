#!/bin/sh
set -eu

echo "{\"event\":\"startup-check\",\"binary\":\"/usr/local/bin/pocket-pitlane-realtime\",\"data_mount\":\"$(test -d /data && echo present || echo absent)\"}"
ls -l /usr/local/bin/pocket-pitlane-realtime
exec /usr/local/bin/pocket-pitlane-realtime
