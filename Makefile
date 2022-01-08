# Available variables:
#		vacantPercentage
#		chainPercentage
#		nearbyShops
#		nearbyPeople
#		nearbyBuildings.meanYear
#		nearbyBuildings.meanArea
#		nearbyBuildings.count

surroundings:
	@./scripts/surroundings.sh nearbyPeople 1000

provinces:
	@./scripts/provinces.sh nearbyPeople 1000

prepare:
	@./scripts/prepare.sh nearbyPeople 1000

geojson:
	@./scripts/geojson-circles.sh nearbyPeople 1000
	@./scripts/geojson-world.sh nearbyPeople 1000

mbtiles:
	@./scripts/mbtiles-circles.sh nearbyPeople 1000
	@./scripts/mbtiles-world.sh 1000

extract:
	@mkdir -p /Volumes/ExFat/Boven.land/data/map-reorder/tiles

	@mb-util --image_format=pbf \
		/Volumes/ExFat/Boven.land/data/map-reorder/circles-nearbyPeople-1000.mbtiles \
		/Volumes/ExFat/Boven.land/data/map-reorder/tiles/circles

	@mb-util --image_format=pbf \
		/Volumes/ExFat/Boven.land/data/map-reorder/world-1000-buildings.mbtiles \
		/Volumes/ExFat/Boven.land/data/map-reorder/tiles/world

s3:
	@aws s3 sync /Volumes/ExFat/Boven.land/data/map-reorder/tiles \
		s3://files.boven.land/tiles/waar-we-winkelen/ --content-encoding gzip
