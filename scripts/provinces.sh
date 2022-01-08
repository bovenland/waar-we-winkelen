#!/usr/bin/env bash

cd "$(dirname "$0")"

KEY=$1
DISTANCE=$2
INPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder
OUTPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder

../provinces.js \
  < $INPUT_DIR/surroundings-$KEY-$DISTANCE.ndjson \
	| ../../ndjson-to-geojson/ndjson-to-geojson.js \
  > $OUTPUT_DIR/provinces-$KEY-$DISTANCE.geojson
