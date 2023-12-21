const { it } = require('node:test')
const assert = require('node:assert')

const { createSyncFn } = require('./index.js')

it('should receive a result synchronously', () => {
  const mySyncFn = createSyncFn(require.resolve('./fixtures/worker.js'))

  const result = mySyncFn({ some: 'some', thing: 'thing' })

  assert.deepEqual(result, { result: 'some...thing' })
})
