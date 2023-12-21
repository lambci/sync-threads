const { it } = require('node:test')
const assert = require('node:assert')

const { createSyncFn } = require('./index.js')

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
