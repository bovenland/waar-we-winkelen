#!/usr/bin/env bash

ogr2ogr -f "GeoJSON" ./data/nearby-shops-desc.geojson PG:"host=localhost user=postgis dbname=postgis password=postgis" "bovenland.nearby_shops_desc" -t_srs EPSG:4326
