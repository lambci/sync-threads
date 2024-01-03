const fs = require('node:fs')

const { runAsWorker } = require('../src/index.js')

runAsWorker((filename) => fs.promises.readFile(filename, 'utf8'))
