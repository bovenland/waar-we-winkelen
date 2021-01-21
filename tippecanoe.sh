#!/usr/bin/env bash

if [ -z "$1" ]
  then
    echo "You must supply the type as the first argumemt"
    exit 1
fi

tippecanoe \
  --layer=circles -j '{ "*": [ "any", [ "==", "type", "$1" ] ] }' \
  -z16 --full-detail=14 \
  --no-tile-size-limit \
  --coalesce --drop-densest-as-needed \
  -o ./data/packed-$1.mbtiles -f \
  --extend-zooms-if-still-dropping ./data/packed.geojson