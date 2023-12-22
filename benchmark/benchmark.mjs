import { Bench } from 'tinybench'
import nativeFn from './native.cjs'
import syncThreadsFn from './sync-threads.cjs'
import synckitFn from './synckit.cjs'

import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)

console.log('Load time')
const loadBench = new Bench({ time: 100 })
loadBench
  .add('native', async () => {
    return await import('./native.cjs')
  })
  .add('sync-threads', async () => {
    return await import('./sync-threads.cjs')
  })
  .add('synckit', async () => {
    return await import('./synckit.cjs')
  })

await loadBench.run()
console.table(loadBench.table())

console.log('Execution time')
const hotBench = new Bench({ time: 100 })
hotBench
  .add('native', async () => {
    return await nativeFn(__filename)
  })
  .add('sync-threads', async () => {
    return await syncThreadsFn(__filename)
  })
  .add('synckit', async () => {
    return await synckitFn(__filename)
  })

await hotBench.run()
console.table(hotBench.table())

console.log('Load time')
const totalBench = new Bench({ time: 100 })
totalBench
  .add('native', async () => {
    const fn = await import('./native.cjs')
    return fn.default(__filename)
  })
  .add('sync-threads', async () => {
    const fn = await import('./sync-threads.cjs')
    return fn.default(__filename)
  })
  .add('synckit', async () => {
    const fn = await import('./synckit.cjs')
    return fn.default(__filename)
  })

await totalBench.run()

// uncomment to show errors
//totalBench.tasks.forEach((t) => console.log(JSON.stringify(t)))

console.table(totalBench.table())
