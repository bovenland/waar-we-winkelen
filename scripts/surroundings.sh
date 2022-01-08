#!/usr/bin/env bash

cd "$(dirname "$0")"

KEY=$1
DISTANCE=$2
INPUT_DIR=/Users/bert/code/boven.land/shops-analyze/data
OUTPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder

cat $INPUT_DIR/shops.ndjson \
	| ../circle-pack.js --key $KEY --distance $DISTANCE --padding 1 --size 1000 \
	| ../add-surroundings.js --distance $DISTANCE \
	> $OUTPUT_DIR/surroundings-$KEY-$DISTANCE.ndjson
