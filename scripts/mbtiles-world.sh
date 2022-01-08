#!/usr/bin/env bash

cd "$(dirname "$0")"

DISTANCE=$1
INPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder
OUTPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder

tippecanoe \
  --layer=buildings -j '{ "*": [ "any", [ "==", "type", "building" ] ] }' \
  -Z7 -z16 --full-detail=14 \
  --no-tile-size-limit \
  --drop-densest-as-needed \
  -o $OUTPUT_DIR/world-$DISTANCE-buildings.mbtiles -f \
  --extend-zooms-if-still-dropping $INPUT_DIR/world-$DISTANCE.geojson
