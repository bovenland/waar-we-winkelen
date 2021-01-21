#!/usr/bin/env node

const R = require('ramda')
const H = require('highland')
const { Pool } = require('pg')

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
      ST_AsGeoJSON(ST_Transform(ST_Intersection(geometry, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int)), 4326), 6)::json AS geometry,
      ST_AsGeoJSON(ST_Transform(ST_Translate(ST_Intersection(geometry, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3)), $5, $6), 4326), 6)::json AS "geometryPacked"
    FROM (
      (SELECT
        'building' AS type, '' AS highway,
        geometry,
        EXISTS (SELECT * FROM bovenland.shops s WHERE ST_Intersects(ST_Transform(b.geometry, 4326), s.geometry) LIMIT 1) AS "containsShop",
        ST_Intersects(ST_Transform(b.geometry, 4326), ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS "centerBuilding"
      FROM
        osm_polygon b
      WHERE
        building <> '' AND
        ST_Intersects(geometry, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int))
    ) UNION ALL (
      SELECT
        'road' AS type, highway,
        geometry,
        FALSE as "containsShop",
        FALSE as "centerBuilding"
      FROM
        osm_linestring l
      WHERE
        highway <> '' AND
        ST_Intersects(geometry, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int))
    ) UNION ALL (
      SELECT
        'water' AS type, '' AS highway,
        geometry,
        FALSE as "containsShop",
        FALSE as "centerBuilding"
      FROM
        osm_polygon p
      WHERE
        "natural" = 'water' AND
        ST_Intersects(geometry, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int))
    )
  ) s`

  const {rows: surroundings} = await client.query(query, [lon, lat, radius, SEGMENTS_QUARTER_CIRCLE, translate3857.x, translate3857.y])

  // TODO: better names for:
  //   map highway to line width!
  return {
    ...row,
    surroundings
  }
}

async function getCircle (client, row) {
  const [lon, lat] = row.nearestBuilding.center.coordinates
  const radius = row.surroundingsRadius
  const translate3857 = row.translate3857

  const query = `SELECT
    ST_AsGeoJSON(ST_Transform(ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int), 4326), 6)::json AS geometry,
    ST_AsGeoJSON(ST_Transform(ST_Translate(ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $3, $4::int), $5, $6), 4326), 6)::json AS "geometryPacked",
    ST_AsGeoJSON(ST_Transform(ST_Translate(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857), $5, $6), 4326), 6)::json AS "centerPacked",
    'circle' AS type`

  const {rows: {0: circle}} = await client.query(query, [lon, lat, radius, SEGMENTS_QUARTER_CIRCLE, translate3857.x, translate3857.y])

  return {
    ...row,
    circle: {
      ...circle,
      center: [lon, lat],
      centerPacked: circle.centerPacked.coordinates
    }
  }
}

// TODO: move to config file
const distance = 250
const summaryFields = [
  [`nearbyPeople${distance}`],
  [`nearbyShops${distance}`],
  [`nearbyFoodAndDrink${distance}`],

  [`nearbyBuildings${distance}`, 'count'],
  [`nearbyBuildings${distance}`, 'meanYear'],
  [`nearbyBuildings${distance}`, 'meanArea'],

  [`vacantPercentage${distance}`],
  [`chainPercentage${distance}`]
]
const pathToKey = (path) => path.map((part) => part.replace(distance, '')).join('.')

function addRowData (row, obj) {
  const query = row.query
  const osmId = row.osmId

  const rowData = R.zipObj(summaryFields.map((pathToKey)), summaryFields.map((path) => R.path(path, row)))

  return {
    osmId,
    query,
    ...rowData,
    ...obj
  }
}

async function run () {
  const client = await pool.connect()

  const output = H(process.stdin)
    .split()
    .compact()
    .map(JSON.parse)
    .flatMap((row) => H(getSurroundings(client, row)))
    .flatMap((row) => H(getCircle(client, row)))

    .map((row) => ([addRowData(row, row.circle), ...row.surroundings
      .map((item) => (addRowData(row, item)))]))
    .flatten()

    .map((JSON.stringify))
    .intersperse('\n')

  output
    .pipe(process.stdout)

  output.observe()
    .done(() => client.release())
}

run()
