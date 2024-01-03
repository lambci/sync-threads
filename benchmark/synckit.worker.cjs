const fs = require('node:fs')

// Using 'synckit' here could skew the benchmark as it would need
// to apply module resolution that isn't needed for sync-threads.
const { runAsWorker } = require('../node_modules/synckit/lib/index.cjs')

runAsWorker((filename) => fs.promises.readFile(filename, 'utf8'))
