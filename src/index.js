// @ts-check

const v8 = require('v8')
const { Worker, parentPort, workerData } = require('worker_threads')

const INT32_BYTES = 4

exports.createSyncFn = createSyncFn
exports.runAsWorker = runAsWorker

/**
 * @typedef {Object} CreateFnOptionsRaw
 * @property {number=} bufferSize The default size of the Buffer
 * @property {number=} maxBufferSize The maximum size of the Buffer
 * @property {number=} timeout Timeout in Milliseconds
 */

/**
 * @typedef {Object} CreateFnOptions
 * @property {number} bufferSize The default size of the Buffer
 * @property {number} maxBufferSize The maximum size of the Buffer
 * @property {number=} timeout Timeout in Milliseconds
 */

/**
 * @param {string} filename
 * @param {CreateFnOptions} options
 * @returns {{worker: Worker, sharedBuffer: SharedArrayBuffer, semaphore: Int32Array }}
 */
function initWorker(filename, options) {
  const sharedBuffer = new SharedArrayBuffer(options.bufferSize, {
    maxByteLength: options.maxBufferSize,
  })
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
 * Set default values to options
 *
 * @param {CreateFnOptionsRaw} options 
 * @returns {CreateFnOptions}
 */
function sanitizeOptions(options) {
  const {
    timeout,
    bufferSize = 1024,
    maxBufferSize = 1024 * 1024
  } = options

  return {
    timeout,
    bufferSize,
    maxBufferSize
  }
}

/**
 * @param {string} filename
 * @param {number | CreateFnOptionsRaw | undefined} bufferSizeOrOptions
 * @returns {(...args: any) => any}
 */
function createSyncFn(filename, bufferSizeOrOptions = {}) {
  const options = sanitizeOptions(typeof bufferSizeOrOptions === 'number'
  ? { bufferSize: bufferSizeOrOptions }
  : bufferSizeOrOptions)

  let { worker, sharedBuffer, semaphore } = initWorker(filename, options)

  return (...inputData) => {
    // Reset SharedArrayBuffer
    Atomics.store(semaphore, 0, 0)

    worker.postMessage({ inputData })

    const result = Atomics.wait(semaphore, 0, 0, options.timeout)
    if (result === 'timed-out') {
      // If the call timed out, we terminate the current worker
      // This avoid leaving resources stuck or penalize the next function call
      worker.terminate()
      const newWorker = initWorker(filename, options)
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
  let buf = v8.serialize(data)

  const expectedBufferLength = buf.length + INT32_BYTES
  if (expectedBufferLength > sharedBuffer.byteLength) {
    if (
      sharedBuffer.growable &&
      expectedBufferLength <= (sharedBuffer.maxByteLength || 0) &&
      sharedBuffer.grow
    ) {
      sharedBuffer.grow(expectedBufferLength)
    } else {
      didThrow = true
      buf = v8.serialize({
        error: new Error(
          `Worker response is bigger than the allowed transfer size. SharedArrayBuffer can accept up to ${sharedBuffer.maxByteLength || sharedBuffer.byteLength} bytes. The response needs ${expectedBufferLength} bytes`
        ),
        properties: {},
      })
    }
  }

  buf.copy(new Uint8Array(sharedBuffer, INT32_BYTES, buf.length))
  const semaphore = new Int32Array(sharedBuffer, 0, 1)
  Atomics.store(semaphore, 0, didThrow ? -buf.length : buf.length)
  Atomics.notify(semaphore, 0)
}
