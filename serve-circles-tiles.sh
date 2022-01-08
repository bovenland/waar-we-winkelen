#!/usr/bin/env bash

cd "$(dirname "$0")"

#KEY=$1
#DISTANCE=$2

INPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder

tessella --port 7887 mbtiles://$INPUT_DIR/circles-nearbyPeople-1000.mbtiles
