#!/usr/bin/env node

const H = require('highland')
const { Pool } = require('pg')

const argv = require('yargs')
  .options({
    distance: {
      alias: 'd',
      describe: 'Distance',
      default: 1000
    }
  })
  .help('help')
  .argv

const config = require('./config')(argv.distance)

const SEGMENTS_QUARTER_CIRCLE = Math.round(13 / 4)

const pool = new Pool({
  user: 'postgis',
  host: 'localhost',
  database: 'postgis',
  password: 'postgis',
  port: 5432
})

async function getSurroundings (client, row) {
  const [lon, lat] = row.nearestBuilding.center.coordinates
  const radius = row.surroundingsRadius
  const translate3857 = row.translate3857

  const query = `
    SELECT
      * ,
      ST_AsGeoJSON(ST_Transform(
        ST_Intersection(
          geometry,
          ST_Buffer(
            ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857),
            $3,
            $4::int
          )
        ),
        4326
      ), 6)::json AS geometry,
      ST_AsGeoJSON(ST_Transform(
        ST_Translate(
          ST_Intersection(
            geometry,
            ST_Buffer(
              ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857),
              $3,
              $4::int
            )
          ),
          $5,
          $6
        ),
        4326
      ), 6)::json AS "geometryCircles"
    FROM (
      (SELECT
        'building' AS type, '' AS highway,
        way AS geometry,
        FALSE AS "containsShop",
        -- create bovenland.shops table to enable this line
        --EXISTS (SELECT * FROM bovenland.shops s WHERE ST_Intersects(ST_Transform(b.way, 4326), s.geometry) LIMIT 1) AS "containsShop",
        ST_Intersects(ST_Transform(b.way, 4326), ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS "centerBuilding"
      FROM
      planet_osm_polygon b
      WHERE
        building <> '' AND
        ST_Intersects(way, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int))
    ) UNION ALL (
      SELECT
        'road' AS type, highway,
        way AS geometry,
        FALSE as "containsShop",
        FALSE as "centerBuilding"
      FROM
      planet_osm_line l
      WHERE
        highway <> '' AND
        ST_Intersects(way, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int))
    ) UNION ALL (
      SELECT
        'water' AS type, '' AS highway,
        way AS geometry,
        FALSE as "containsShop",
        FALSE as "centerBuilding"
      FROM
        planet_osm_polygon p
      WHERE
        "natural" = 'water' AND
        ST_Intersects(way, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int))
    )
  ) s`

  const {rows: surroundings} = await client.query(query, [lon, lat, radius, SEGMENTS_QUARTER_CIRCLE, translate3857.x, translate3857.y])

  return {
    ...row,
    surroundings
  }
}

async function getCircle (client, row) {
  const [lon, lat] = row.nearestBuilding.center.coordinates
  const radius = row.surroundingsRadius
  const translate3857 = row.translate3857

  const query = `
    WITH b AS (
      SELECT ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int) AS buffer
    )
    SELECT
      ST_AsGeoJSON(ST_Transform(b.buffer, 4326), 6)::json AS geometry,
      ST_AsGeoJSON(ST_Transform(ST_Translate(b.buffer, $5, $6), 4326), 6)::json AS "geometryCircles",
      ST_AsGeoJSON(
        ST_Transform(
          ST_Translate(
            ST_Centroid(
              ST_SetSRID(
                ST_MakeLine(
                  ST_Point(ST_XMin(b.buffer), ST_YMin(b.buffer)),
                  ST_Point(ST_XMax(b.buffer), ST_YMin(b.buffer))
                ),
                3857
              )
            ),
            $5, $6
          ), 4326), 6)::json AS "labelGeometryCircles",
      ST_AsGeoJSON(ST_Transform(ST_Translate(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $5, $6), 4326), 6)::json AS "centerCircles",
      'circle' AS type
    FROM b`

  const {rows: {0: circle}} = await client.query(query, [lon, lat, radius, SEGMENTS_QUARTER_CIRCLE, translate3857.x, translate3857.y])

  return {
    ...row,
    circle: {
      ...circle,
      centerWorld: [lon, lat],
      centerCircles: circle.centerCircles.coordinates
    },
    circleLabel: {
      ...circle,
      type: 'circleLabel',
      labelGeometryCircles: undefined,
      geometryCircles: circle.labelGeometryCircles
    }
  }
}

function addRowData (row, obj) {
  const properties = [
    ...config.summaryProperties,
    ...config.featureProperties,
    ...config.jsonProperties
  ]

  const osmId = row.osmId || row.nearestBuilding.osmId
  const rowData = config.zipProperties(properties, row)

  let circleData
  if (obj.type === 'circle' || obj.type === 'circleLabel') {
    const houseNumber = row.address && row.address.houseNumber
    const street = row.address && row.address.street
    const postcode = row.address && row.address.postcode
    const city = row.address && row.address.city

    circleData = {
      name: row.name,
      houseNumber,
      street,
      postcode,
      city,
      province: row.province
    }
  }

  const center = {
    world: row.nearestBuilding.center.coordinates,
    circles: row.circle.centerCircles
  }

  return {
    osmId,
    ...rowData,
    ...obj,
    ...circleData,
    center
  }
}

async function run () {
  const client = await pool.connect()

  let id = 0
  const output = H(process.stdin)
    .split()
    .compact()
    .map(JSON.parse)
    .flatMap((row) => H(getSurroundings(client, row)))
    .flatMap((row) => H(getCircle(client, row)))
    .map((row) => ([addRowData(row, row.circle), addRowData(row, row.circleLabel), ...row.surroundings
      .map((item) => (addRowData(row, item)))]))
    .flatten()
    .map((row) => ({
      id: id++,
      ...row
    }))
    .map((JSON.stringify))
    .intersperse('\n')

  output
    .pipe(process.stdout)

  output.observe()
    .done(() => client.release())
}

run()
