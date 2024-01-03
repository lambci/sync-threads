const { runAsWorker } = require('../../src/index.js')

runAsWorker(async ({ some, thing }) => {
  return { result: `${some}...${thing}` }
})
