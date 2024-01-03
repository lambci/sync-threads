const { it } = require('node:test')
const assert = require('node:assert')

const { createSyncFn } = require('../src/index.js')

it('should receive a result synchronously', () => {
  const mySyncFn = createSyncFn(require.resolve('./fixtures/worker.js'))

  const result = mySyncFn({ some: 'some', thing: 'thing' })

  assert.deepEqual(result, { result: 'some...thing' })
})

it('should receive allow reusing a function', () => {
  const mySyncFn = createSyncFn(require.resolve('./fixtures/worker.js'))

  const result = mySyncFn({ some: 'some', thing: 'thing' })
  assert.deepEqual(result, { result: 'some...thing' })

  const result2 = mySyncFn({ some: 'other', thing: 'thing' })
  assert.deepEqual(result2, { result: 'other...thing' })
})

it('should forward errors', () => {
  const syncFn = createSyncFn(require.resolve('./fixtures/brokenWorker.js'))

  assert.throws(() => syncFn(), { message: 'This one goes kaboom!' })
})

it('should forward fields of errors', () => {
  const syncFn = createSyncFn(require.resolve('./fixtures/brokenWorker.js'))

  let threwError = false

  try {
    syncFn()
  } catch (e) {
    threwError = true
    assert.deepEqual(e.message, 'This one goes kaboom!')
    assert.deepEqual(e.customField, 'The answer is 42')
  }

  assert.equal(threwError, true)
})

it('should support any number of arguments', () => {
  const mySyncFn = createSyncFn(require.resolve('./fixtures/multiArgWorker.js'))

  const result = mySyncFn('one')
  assert.deepEqual(result, 1)

  const result2 = mySyncFn('one', 'two')
  assert.deepEqual(result2, 2)

  const result3 = mySyncFn('one', 'two', 'three', 'four')
  assert.deepEqual(result3, 4)

  const result4 = mySyncFn()
  assert.deepEqual(result4, 0)
})

it('should properly catch timeouts', () => {
  // We put a timeout that's high enough to not be triggered by a slow CI
  const timeout = 100
  const syncFn = createSyncFn(require.resolve('./fixtures/slowWorker.js'), { timeout })

  assert.throws(() => syncFn(true), {
    message: 'Timed out running async function',
  })

  // Calling the function a second time should not fail
  // This could happen if the function is still waiting on the result of the first call
  const result = syncFn(false)
  assert.deepEqual(result, true)
})

it('works with responses that require the SharedArrayBuffer to grow', async () => {
  const mySyncFn = createSyncFn(require.resolve('./fixtures/worker.js'), {
    bufferSize: 1024, // 1KB
    maxBufferSize: 1024 * 1024 // 1MB
  })

  // 2KB String
  const longString = 'x'.repeat(1024 * 2)

  const result = mySyncFn({ some: 'some', thing: longString })

  assert.deepEqual(result, { result: `some...${longString}` })
})

it('properly warns on responses that are too big', async () => {
  process.env.SYNCKIT_MAX_BUFFER_SIZE = `${1024 * 1024}`

  const mySyncFn = createSyncFn(require.resolve('./fixtures/worker.js'), {
    bufferSize: 1024, // 1KB
    maxBufferSize: 1024 * 1024 // 1MB
  })

  // 10MB string
  const longString = 'x'.repeat(10 * 1024 * 1024)

  assert.throws(() => mySyncFn({ some: 'some', thing: longString }), {
    message: 'Worker response is bigger than the allowed transfer size. SharedArrayBuffer can accept up to 1048576 bytes. The response needs 10485789 bytes',
  })

  // Calling the function a second time should not fail
  const result2 = mySyncFn({ some: 'other', thing: 'thing' })
  assert.deepEqual(result2, { result: 'other...thing' })
})
