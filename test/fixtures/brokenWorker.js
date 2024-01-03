const { runAsWorker } = require('../../src/index.js')

runAsWorker(async () => {
  const err = new Error('This one goes kaboom!')

  err.customField = 'The answer is 42'

  throw err
})
