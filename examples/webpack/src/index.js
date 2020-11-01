const { createSyncFn } = require('sync-threads')

// Create our synchronous function
const getSsmSecretSync = createSyncFn('./worker.js')

// Call it at init (require) time, no async needed!
const secret = getSsmSecretSync('/my-secret')

// Logged at init time
console.log({ secret, source: 'init' })

exports.handler = async () => {
  // This value can be used in our handler without needing to resolve anything async
  console.log({ secret, source: 'handler' })
}
