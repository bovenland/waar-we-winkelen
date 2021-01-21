surroundings:
	@awk 1 ../shops-analyze/data/shops.ndjson ../shops-analyze/data/boxes.ndjson | \
		./circle-pack.js -k nearbyShops -d 250 | ./translate-surroundings.js > ./data/surroundings.ndjson

geojson:
	@cat ./data/surroundings.ndjson | \
		jq -c '.["geometry"] = .geometryPacked | del(.geometryPacked)' | \
		../ndjson-to-geojson/ndjson-to-geojson.js > \
		./data/packed.geojson

	@cat ./data/surroundings.ndjson | \
		jq -c 'del(.geometryPacked)' | \
		../ndjson-to-geojson/ndjson-to-geojson.js > \
		./data/map.geojson

gpkg:
	@ogr2ogr -f "GPKG" ./data/packed.gpkg ./data/packed.geojson

	@ogr2ogr -f "GPKG" ./data/map.gpkg ./data/map.geojson

mbtiles:
	@tippecanoe \
		--layer=buildings -j '{ "*": [ "any", [ "==", "type", "building" ] ] }' \
		-Z11 -z16 --full-detail=14 \
		--no-tile-size-limit \
		--buffer=2 \
		--simplification=12 \
		--coalesce --drop-densest-as-needed \
		-o ./data/packed-buildings.mbtiles -f \
		--extend-zooms-if-still-dropping ./data/packed.geojson

	@tippecanoe \
		--layer=roads -j '{ "*": [ "any", [ "==", "type", "road" ] ] }' \
		-Z13 -z16 --full-detail=14 \
		--no-tile-size-limit \
		--buffer=2 \
		--simplification=12 \
		--coalesce --drop-densest-as-needed \
		-o ./data/packed-roads.mbtiles -f \
		--extend-zooms-if-still-dropping ./data/packed.geojson

	@tippecanoe \
		--layer=water -j '{ "*": [ "any", [ "==", "type", "water" ] ] }' \
		-Z13 -z16 --full-detail=14 \
		--no-tile-size-limit \
		--buffer=2 \
		--simplification=12 \
		--coalesce --drop-densest-as-needed \
		-o ./data/packed-water.mbtiles -f \
		--extend-zooms-if-still-dropping ./data/packed.geojson

	@tippecanoe \
		--layer=circles -j '{ "*": [ "any", [ "==", "type", "circle" ] ] }' \
		-z16 --full-detail=14 \
		--no-tile-size-limit \
		--coalesce --drop-densest-as-needed \
		-o ./data/packed-circles.mbtiles -f \
		--extend-zooms-if-still-dropping ./data/packed.geojson

	@tile-join -o ./data/packed.mbtiles -f \
		--no-tile-size-limit \
		./data/packed-roads.mbtiles \
		./data/packed-water.mbtiles \
		./data/packed-buildings.mbtiles \
		./data/packed-circles.mbtiles

	@tippecanoe \
		--layer=circles -j '{ "*": [ "any", [ "==", "type", "circle" ] ] }' \
		-z16 --full-detail=14 \
		--no-tile-size-limit \
		--coalesce --drop-densest-as-needed \
		-o ./data/map.mbtiles -f \
		--extend-zooms-if-still-dropping ./data/map.geojson

extract:
	@mkdir ./tiles

	@mb-util --image_format=pbf ./data/packed.mbtiles ./tiles/packed
	@mb-util --image_format=pbf ./data/map.mbtiles ./tiles/map

stats:
	@tippecanoe-decode --stats ./data/packed.mbtiles

s3:
	@aws s3 sync ./tiles s3://files.boven.land/waar-we-winkelen/tiles --content-encoding gzip
