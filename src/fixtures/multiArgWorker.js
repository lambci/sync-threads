const { runAsWorker } = require('../index.js')

runAsWorker(async (...args) => {
  return args.length
})
