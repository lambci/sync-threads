const SSM = require('aws-sdk/clients/ssm')
const { runAsWorker } = require('sync-threads')

const ssm = new SSM()

runAsWorker(async (ssmParamName) => {
  const {
    Parameter: { Value },
  } = await ssm.getParameter({ Name: ssmParamName, WithDecryption: true }).promise()
  return Value
})
