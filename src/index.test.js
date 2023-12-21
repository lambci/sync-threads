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
  const syncFn = createSyncFn(require.resolve('./fixtures/slowWorker.js'), undefined, 5)

  assert.throws(() => syncFn(1, 100), {
    message: 'Timed out running async function',
  })
})
