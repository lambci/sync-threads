const { runAsWorker } = require('../../src/index.js')

runAsWorker(async (wait) => {
  if (wait) {
    // Not using setTimeout here as we actually want to
    // fully block the thread to simulate a stuck script
    // Using await would not achieve this result
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000)
  }

  return true
})
