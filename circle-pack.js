#!/usr/bin/env node

const proj4 = require('proj4')
const R = require('ramda')
const H = require('highland')
const d3 = require('d3-hierarchy')

const argv = require('yargs')
  .options({
    distance: {
      alias: 'd',
      describe: 'Distance',
      default: 1000
    },
    key: {
      alias: 'k',
      describe: 'NDJSON key',
      demandOption: true
    },
    padding: {
      alias: 'p',
      describe: 'Circle padding',
      default: 1
    },
    size: {
      alias: 's',
      describe: 'Total size',
      default: 1000
    },
    group: {
      alias: 'g',
      describe: 'Group circles by property',
      default: 'province'
    }
  })
  .help('help')
  .argv

// Sort path and function
const parts = argv.key.split('.')
const path = [`${parts[0]}${argv.distance}`, ...parts.slice(1)]

// Center is smallest:
// const sortFn = (a, b) => R.path(path, a) - R.path(path, b)

// Center is highest:
const sortFn = (a, b) => R.path(path, b) - R.path(path, a)

// Circle packing configuration
const padding = argv.padding
const size = argv.size
const group = argv.group

H(process.stdin)
  .split()
  .compact()
  .map(JSON.parse)
  .group((row) => row.nearestBuilding.osmId)
  .map((groups) => H(Object.values(groups)))
  .merge()
  .map((shopsPerBuilding) => ({
    shopsPerBuilding: shopsPerBuilding.length,
    ...shopsPerBuilding[0],
    name: undefined,
    osmId: undefined,
    osmType: undefined,
    shop: undefined,
    chain: undefined,
    shops: shopsPerBuilding.map((shop) => ({
      name: shop.name,
      osmId: shop.osmId,
      osmType: shop.osmType,
      shop: shop.shop,
      chain: shop.chain
    }))
  }))
  // For now, only use shops that have an OSM address...
  .filter((row) => row.address.street && row.address.city)
  .map((row) => ({
    ...row,
    surroundingsArea: circleArea(row.surroundingsRadius)
  }))
  .filter((row) => row[group])
  .group(group)
  .map(pack)
  .flatten()
  .map(unpack)
  .map(addTransform)
  .map((JSON.stringify))
  .intersperse('\n')
  .pipe(process.stdout)

function circleArea (radius) {
  return Math.PI * Math.pow(radius, 2)
}

function pack (groups) {
  const data = {
    children: Object.entries(groups)
      .map(([group, rows]) => ({
        group,
        children: rows.sort(sortFn)
      }))
  }

  const hierarchy = d3.hierarchy(data).sum((d) => d.surroundingsArea)
  const packed = d3.pack().size([size, size]).padding(padding)(hierarchy)

  return packed.leaves()
}

function unpack (node) {
  const packed = {
    x: node.x,
    y: node.y,
    radius: node.r
  }

  return {
    ...node.data,
    packed
  }
}

const circlePackCenter3857 = {
  x: 599700.4721210138,
  y: 6828231.318039063
}

function addTransform (row) {
  const scale = row.surroundingsRadius / row.packed.radius

  const center4326 = row.nearestBuilding.center.coordinates
  const center3857 = proj4('EPSG:4326', 'EPSG:3785', center4326)

  return {
    ...row,
    translate3857: {
      x: row.packed.x * scale - center3857[0] + circlePackCenter3857.x,
      y: row.packed.y * scale - center3857[1] + circlePackCenter3857.y,
      radius: row.surroundingsRadius
    }
  }
}
