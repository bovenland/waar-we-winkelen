# Maps, reordered

Steps:

  1. Compute circle packing and translation parameters;
  2. Get surrounding features from database and translate;
  3. Create GeoJSON
  4. Create vector tiles

Steps 1, 2 and 3 at once:

    ./circle-pack.js < ../shops-analyze/data/shops.ndjson | ./translate-surroundings.js | ../ndjson-to-geojson/ndjson-to-geojson.js > ./data/packed.geojson

## See also

- https://blog.cyclemap.link/2020-02-02-optimizing-vectortiles/