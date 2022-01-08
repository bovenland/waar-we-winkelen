const R = require('ramda')

module.exports = function (distance = 1000) {
  const summaryProperties = [
    [`nearbyPeople${distance}`],
    [`nearbyShops${distance}`],
    [`nearbyFoodAndDrink${distance}`],

    [`nearbyBuildings${distance}`, 'count'],
    [`nearbyBuildings${distance}`, 'meanYear'],
    [`nearbyBuildings${distance}`, 'meanArea'],

    [`vacantPercentage${distance}`],
    [`chainPercentage${distance}`]
  ]

  const featureProperties = [
    ['query']
  ]

  const jsonProperties = [
    ['name'],
    ['shop'],
    ['chain']
  ]

  const pathToKey = (path) => path.map((part) => part.replace(distance, '')).join('.')

  function zipProperties (properties, row) {
    return R.zipObj(properties.map((pathToKey)), properties.map((path) => R.path(path, row)))
  }

  return {
    summaryProperties,
    featureProperties,
    jsonProperties,
    pathToKey,
    zipProperties
  }
}
