const { runAsWorker } = require('../../src/index.js')

runAsWorker(async (...args) => {
  return args.length
})
