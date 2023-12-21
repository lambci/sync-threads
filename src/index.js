// @ts-check

const v8 = require('v8')
const { Worker, workerData } = require('worker_threads')

const INT32_BYTES = 4

exports.createSyncFn = createSyncFn
exports.runAsWorker = runAsWorker

/**
 * @param {string} filename
 * @param {number} bufferSize
 * @returns (inputData?: any) => any
 */
function createSyncFn(filename, bufferSize = 64 * 1024) {
  return (inputData = {}) => {
    const sharedBuffer = new SharedArrayBuffer(bufferSize)
    const semaphore = new Int32Array(sharedBuffer)
    const worker = new Worker(filename, { workerData: { inputData, sharedBuffer } })
    worker.on('error', (e) => {
      throw e
    })
    Atomics.wait(semaphore, 0, 0)
    let length = semaphore[0]
    let didThrow = false
    if (length < 0) {
      didThrow = true
      length *= -1
    }
    const data = v8.deserialize(Buffer.from(sharedBuffer, INT32_BYTES, length))
    if (didThrow) {
      throw data
    }
    return data
  }
}

/**
 * @param {(inputData: any) => Promise<any>} workerAsyncFn
 * @returns void
 */
async function runAsWorker(workerAsyncFn) {
  const { inputData, sharedBuffer } = workerData
  let data,
    didThrow = false
  try {
    data = await workerAsyncFn(inputData)
  } catch (e) {
    data = e
    didThrow = true
  }
  notifyParent(sharedBuffer, data, didThrow)
}

/**
 * @param {SharedArrayBuffer} sharedBuffer
 * @param {any} data
 * @param {boolean} didThrow
 * @returns void
 */
function notifyParent(sharedBuffer, data, didThrow) {
  const buf = v8.serialize(data)
  buf.copy(Buffer.from(sharedBuffer), INT32_BYTES)
  const semaphore = new Int32Array(sharedBuffer)
  Atomics.store(semaphore, 0, didThrow ? -buf.length : buf.length)
  Atomics.notify(semaphore, 0)
}
