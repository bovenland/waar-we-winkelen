#!/usr/bin/env node

const H = require('highland')
const R = require('ramda')
const ss = require('simple-statistics')

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

const summaryProperties = config.summaryProperties
  .map((path) => [config.pathToKey(path)])

const jsonProperties = [
  ...config.jsonProperties,
  ...config.featureProperties
].map((path) => [config.pathToKey(path)])

let lastOsmId
let rowsForOsmId = []

function groupByOsmIdOrdered (err, row, push, next) {
  if (err) {
    push(err)
    next()
  } else if (row === H.nil) {
    // Stream finished, push collected rows
    push(null, rowsForOsmId)
    push(null, row)
  } else {
    let rows

    if (lastOsmId !== row.osmId) {
      rows = rowsForOsmId
      rowsForOsmId = [row]
    } else {
      rowsForOsmId.push(row)
    }

    lastOsmId = row.osmId
    if (rows && rows.length) {
      push(null, rows)
    }
    next()
  }
}

function summarize (rows) {
  const summary = summaryProperties.map((property) => {
    const bins = 25
    const data = rows.map((row) => R.path(['summary', ...property], row))

    const breaks = ss.equalIntervalBreaks(data, bins)

    return [
      property,
      {
        extent: ss.extent(data),
        mean: ss.mean(data),
        median: ss.median(data),
        standardDeviation: ss.standardDeviation(data),
        equalIntervalBreaks: breaks,
        histogram: breaks.slice(1)
          .map((brk, index) => data.filter((num) => num >= breaks[index] && num < brk).length)
      }
    ]
  })

  return R.fromPairs(summary)
}

H(process.stdin)
  .split()
  .compact()
  .map(JSON.parse)
  .consume(groupByOsmIdOrdered)
  .map((rows) => {
    const circleId = rows
      .filter((row) => row.type === 'circle')
      .map((row) => row.id)[0]
    // const ids = rows.map((row) => row.id)

    const firstRow = rows[0]

    const rowData = config.zipProperties(jsonProperties, firstRow)
    const summaryData = config.zipProperties(summaryProperties, firstRow)

    return {
      ...rowData,
      summary: summaryData,
      circleId
      // ids
    }
  })
  .toArray((rows) => {
    const json = {
      summary: summarize(rows),
      rows: rows.map((row) => ({...row, summary: undefined}))
    }

    console.log(JSON.stringify(json, null, 2))
  })
