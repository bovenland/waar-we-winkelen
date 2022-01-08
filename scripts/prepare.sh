#!/usr/bin/env bash

cd "$(dirname "$0")"

KEY=$1
DISTANCE=$2
INPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder
OUTPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder

../prepare-for-web.js --distance $DISTANCE \
  < $INPUT_DIR/surroundings-$KEY-$DISTANCE.ndjson \
  > $OUTPUT_DIR/map-data-$DISTANCE.json
