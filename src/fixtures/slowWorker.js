const { setTimeout } = require('node:timers/promises')
const { runAsWorker } = require('../index.js')

runAsWorker(async () => {
  await setTimeout(300, 'value')
  return true
})
