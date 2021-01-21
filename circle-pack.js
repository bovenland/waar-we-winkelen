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
      default: 250
    },
    key: {
      alias: 'k',
      describe: 'NDJSON key',
      demandOption: true
    }
  })
  .help('help')
  .argv

// Sort path and function
const parts = argv.key.split('.')
const path = [`${parts[0]}${argv.distance}`, ...parts.slice(1)]
const sortFn = (a, b) => R.path(path, a) - R.path(path, b)

// Circle packing configuration
const padding = 2
const size = 1000

H(process.stdin)
  .split()
  .compact()
  .map(JSON.parse)
  .map((row) => ({
    ...row,
    surroundingsArea: circleArea(row.surroundingsRadius)
  }))
  .group('query')
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
      .map(([query, rows]) => ({
        query,
        children: rows.sort(sortFn)
      }))
  }

  const hierarchy = d3.hierarchy(data).sum((d) => d.surroundingsArea)

  const packed = d3.pack().size([size, size]).padding(padding)(hierarchy)
  return packed.leaves()
}

function unpack (node) {
  const packed = {
    // x: node.parent.x - node.x,
    // y: node.parent.y - node.y,
    x: node.x,
    y: node.y,
    radius: node.r
  }

  return {
    ...node.data,
    packed
  }
}

// TODO: is this correct?!
const circlePackCenter3857 = {x: 599700.4721210138, y: 6828231.318039063}

function addTransform (row) {
  const scale = row.surroundingsRadius / row.packed.radius

  const center4326 = row.nearestBuilding.center.coordinates
  const center3857 = proj4('EPSG:4326', 'EPSG:3785', center4326)

  return {
    ...row,
    translate3857: {
      x: row.packed.x * scale - center3857[0] + circlePackCenter3857.x,
      y: row.packed.y * scale - center3857[1] + circlePackCenter3857.y
    }
  }
}
