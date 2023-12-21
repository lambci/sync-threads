const { runAsWorker } = require('../index.js')

runAsWorker(async ({ some, thing }) => {
  return { result: `${some}...${thing}` }
})
