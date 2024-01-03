// Using 'synckit' here could skew the benchmark as it would need
// to apply module resolution that isn't needed for sync-threads.
const { createSyncFn } = require('../node_modules/synckit/lib/index.cjs')

/**
 * @type {() => string}
 */
const syncFn = createSyncFn(require.resolve('./synckit.worker.cjs'))

module.exports = syncFn
