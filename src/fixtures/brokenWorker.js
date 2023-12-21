const { runAsWorker } = require('../index.js')

runAsWorker(async () => {
  throw new Error('This one goes kaboom!')
})
