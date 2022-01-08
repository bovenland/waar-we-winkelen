#!/usr/bin/env bash

INPUT_DIR=/Volumes/ExFat/Boven.land/data/map-reorder
cd $INPUT_DIR
http-server -p 8866 --cors
