#!/usr/bin/env node

// Adds GeoJSON circles for each province in surroundings NDJSON file

const H = require('highland')
const turf = require('@turf/turf')

H(process.stdin)
  .split()
  .compact()
  .map(JSON.parse)
  .filter((row) => row.province)
  .group((row) => row.province)
  .map((groups) => H(Object.values(groups)))
  .merge()
  .map((rowsPerProvince) => {
    let province = rowsPerProvince[0].province

    if (province === 'Fryslân') {
      province = 'Friesland'
    }

    const features = rowsPerProvince.map((row) => turf.feature(row.geometryCircles))
    const geojson = turf.featureCollection(features)
    const bbox = turf.bbox(geojson)

    const polygon = turf.bboxPolygon(bbox)
    const center = turf.center(polygon)

    const radius = Math.sqrt(turf.area(polygon)) / 2

    const options = {
      steps: 100,
      units: 'meters'
    }

    const circle = turf.circle(center, radius, options)

    return {
      province,
      geometry: circle.geometry
    }
  })
  .map((JSON.stringify))
  .intersperse('\n')
  .pipe(process.stdout)
