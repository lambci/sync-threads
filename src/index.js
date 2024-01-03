// @ts-check

const v8 = require('v8')
const { Worker, parentPort, workerData } = require('worker_threads')

const INT32_BYTES = 4

exports.createSyncFn = createSyncFn
exports.runAsWorker = runAsWorker

/**
 * @param {string} filename
 * @param {number} bufferSize
 * @returns {{worker: Worker, sharedBuffer: SharedArrayBuffer, semaphore: Int32Array }}
 */
function initWorker(filename, bufferSize) {
  const sharedBuffer = new SharedArrayBuffer(bufferSize)
  const semaphore = new Int32Array(sharedBuffer, 0, 1)

  const worker = new Worker(filename, {
    workerData: { sharedBuffer },
  })

  worker.on('error', (e) => {
    throw e
  })

  // Make sure it won't block the process from exiting
  worker.unref()

  return { worker, sharedBuffer, semaphore }
}

/**
 * @param {string} filename
 * @param {number} bufferSize
 * @param {number} timeoutMs Timeout in Milliseconds
 * @returns {(...args: any) => any}
 */
function createSyncFn(filename, bufferSize = 64 * 1024, timeoutMs) {
  let { worker, sharedBuffer, semaphore } = initWorker(filename, bufferSize)

  return (...inputData) => {
    // Reset SharedArrayBuffer
    Atomics.store(semaphore, 0, 0)

    worker.postMessage({ inputData })

    const result = Atomics.wait(semaphore, 0, 0, timeoutMs)
    if (result === 'timed-out') {
      // If the call timed out, we terminate the current worker
      // This avoid leaving resources stuck or penalize the next function call
      worker.terminate()
      const newWorker = initWorker(filename, bufferSize)
      worker = newWorker.worker
      sharedBuffer = newWorker.sharedBuffer
      semaphore = newWorker.semaphore

      throw new Error('Timed out running async function')
    }

    let length = semaphore[0]
    let didThrow = false
    if (length < 0) {
      didThrow = true
      length *= -1
    }
    const data = v8.deserialize(new Uint8Array(sharedBuffer, INT32_BYTES, length))
    if (didThrow) {
      throw Object.assign(data.error, data.properties)
    }
    return data
  }
}

/**
 * Serialization does not copy properties of error objects
 * @param {Record<string, any> | unknown} object
 * @returns {Record<string, any> | undefined}
 */
function extractProperties(object) {
  if (object && typeof object === 'object') {
    /** @type {Record<string, any>} */
    const knownObj = object
    /** @type {Record<string, any>} */
    const properties = {}
    for (const key in object) {
      properties[key] = knownObj[key]
    }
    return properties
  }
}

/**
 * @param {(...inputData: any) => Promise<any>} workerAsyncFn
 * @returns void
 */
async function runAsWorker(workerAsyncFn) {
  if (!parentPort || !workerData) {
    throw new Error('Cannot connect to parent thread, are you running this function in a worker ?')
  }

  const { sharedBuffer } = workerData

  parentPort.on('message', ({ inputData }) => {
    ;(async () => {
      let data,
        didThrow = false
      try {
        data = await workerAsyncFn(...inputData)
      } catch (error) {
        data = { error, properties: extractProperties(error) }
        didThrow = true
      }
      notifyParent(sharedBuffer, data, didThrow)
    })()
  })
}

/**
 * @param {SharedArrayBuffer} sharedBuffer
 * @param {any} data
 * @param {boolean} didThrow
 * @returns void
 */
function notifyParent(sharedBuffer, data, didThrow) {
  buf.copy(new Uint8Array(sharedBuffer, INT32_BYTES, buf.length))
  const semaphore = new Int32Array(sharedBuffer, 0, 1)
  Atomics.store(semaphore, 0, didThrow ? -buf.length : buf.length)
  Atomics.notify(semaphore, 0)
}
