const { setTimeout } = require('node:timers/promises')
const { runAsWorker } = require('../index.js')

runAsWorker(async (wait) => {
  if (wait) {
    await setTimeout(1000, 'value')
  }

  return true
})
