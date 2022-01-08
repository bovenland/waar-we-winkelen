#!/usr/bin/env bash

cd "$(dirname "$0")"

KEY=$1
DISTANCE=$2
INPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder
OUTPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder

tippecanoe \
  --layer=provinces --no-duplication \
  -o $OUTPUT_DIR/circles-$KEY-$DISTANCE-provinces.mbtiles -f \
  $INPUT_DIR/provinces-$KEY-$DISTANCE.geojson

#	Removed --simplification=10 from roads and buildings

# tippecanoe \
#   --layer=buildings -j '{ "*": [ "any", [ "==", "type", "building" ] ] }' \
#   -Z12 -z16 --full-detail=14 \
#   --no-tile-size-limit \
#   --buffer=2 \
#   --coalesce --drop-densest-as-needed \
#   -o $OUTPUT_DIR/circles-$KEY-$DISTANCE-buildings.mbtiles -f \
#   --extend-zooms-if-still-dropping $INPUT_DIR/circles-$KEY-$DISTANCE.geojson

# tippecanoe \
#   --layer=roads -j '{ "*": [ "any", [ "==", "type", "road" ] ] }' \
#   -Z13 -z16 --full-detail=14 \
#   --no-tile-size-limit \
#   --buffer=2 \
#   --coalesce --drop-densest-as-needed \
#   -o $OUTPUT_DIR/circles-$KEY-$DISTANCE-roads.mbtiles -f \
#   --extend-zooms-if-still-dropping $INPUT_DIR/circles-$KEY-$DISTANCE.geojson

# tippecanoe \
#   --layer=water -j '{ "*": [ "any", [ "==", "type", "water" ] ] }' \
#   -Z13 -z16 --full-detail=14 \
#   --no-tile-size-limit \
#   --buffer=2 \
#   --coalesce --drop-densest-as-needed \
#   -o $OUTPUT_DIR/circles-$KEY-$DISTANCE-water.mbtiles -f \
#   --extend-zooms-if-still-dropping $INPUT_DIR/circles-$KEY-$DISTANCE.geojson

# tippecanoe \
#   --layer=circles -j '{ "*": [ "any", [ "==", "type", "circle" ] ] }' \
#   -z16 --full-detail=14 \
#   --no-tile-size-limit \
#   --drop-densest-as-needed \
#   -o $OUTPUT_DIR/circles-$KEY-$DISTANCE-circles.mbtiles -f \
#   --extend-zooms-if-still-dropping $INPUT_DIR/circles-$KEY-$DISTANCE.geojson

tippecanoe \
  --layer=circleLabels -j '{ "*": [ "any", [ "==", "type", "circleLabel" ] ] }' \
  --no-duplication \
  -Z15 -z16 --full-detail=15 \
  --no-tile-size-limit \
  --drop-densest-as-needed \
  -o $OUTPUT_DIR/circles-$KEY-$DISTANCE-circle-labels.mbtiles -f \
  --extend-zooms-if-still-dropping $INPUT_DIR/circles-$KEY-$DISTANCE.geojson

tile-join -o $OUTPUT_DIR/circles-$KEY-$DISTANCE.mbtiles -f \
  --no-tile-size-limit \
  $OUTPUT_DIR/circles-$KEY-$DISTANCE-provinces.mbtiles \
  $OUTPUT_DIR/circles-$KEY-$DISTANCE-roads.mbtiles \
  $OUTPUT_DIR/circles-$KEY-$DISTANCE-water.mbtiles \
  $OUTPUT_DIR/circles-$KEY-$DISTANCE-buildings.mbtiles \
  $OUTPUT_DIR/circles-$KEY-$DISTANCE-circles.mbtiles \
  $OUTPUT_DIR/circles-$KEY-$DISTANCE-circle-labels.mbtiles
