const { createSyncFn } = require('../src/index.js')

/**
 * @type {() => string}
 */
const syncFn = createSyncFn(require.resolve('./sync-threads.worker.cjs'))

module.exports = syncFn
