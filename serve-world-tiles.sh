#!/usr/bin/env bash

cd "$(dirname "$0")"

#DISTANCE=$1

INPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder

tessella --port 7778 mbtiles://$INPUT_DIR/world-1000-buildings.mbtiles

