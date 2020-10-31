const { createSyncFn } = require('sync-threads')

const getSsmSecretSync = createSyncFn('./worker.js')

// Happens at init (require) time
const secret = getSsmSecretSync('/my-secret')

console.log({ secret, source: 'init' })

exports.handler = async () => {
  // Happens every invoke
  const secret = getSsmSecretSync('/my-secret')

  console.log({ secret, source: 'handler' })
}
