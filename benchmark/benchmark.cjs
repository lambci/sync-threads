const Benchmark = require('benchmark')
const nativeFn = require('./native.cjs')
const syncThreadsFn = require('./sync-threads.cjs')
const synckitFn = require('./synckit.cjs')

let previousMemory = 0;

function memoryUsage(name) {
  const currentMemory = process.memoryUsage().rss
  const diff = currentMemory-previousMemory
  const sign = diff > 0 ? '+' : '';

  console.log(`[${name}] Memory usage ${currentMemory/1000000}MB (${sign}${diff/1000000}MB)`);

  previousMemory = currentMemory;
}

memoryUsage('initial')

function runAndPrint(suite) {
  // add listeners
  suite
    .on('cycle', function (event) {
      memoryUsage(`after ${event.target.name}`)
    })
    .on('complete', function () {
      console.log()
      const fastest = this.filter('fastest').map('name')
      console.log('Fastest is ' + fastest)

      var bySpeed = this.filter('successful').sort(function (a, b) {
        a = a.stats
        b = b.stats
        return a.mean + a.moe > b.mean + b.moe ? -1 : 1
      })

      const results = []
      let result
      while ((result = bySpeed.pop())) {
        //console.log(result)
        results.push({
          'Task Name': result.name,
          'ops/sec': result.hz.toLocaleString('en-US', {
            maximumFractionDigits: 0,
          }),
          //'Average Time (ns)': result.stats.mean * 1e9,
          Margin: `\xB1 ${result.stats.rme.toFixed(2)}%`,
          Samples: result.stats.sample.length,
        })
      }

      console.table(results)
    })
    .run()
}

console.log('Load time')
const loadBench = new Benchmark.Suite()
loadBench
  .add('native', () => {
    return require('./native.cjs')
  })
  .add('sync-threads', () => {
    return require('./sync-threads.cjs')
  })
  .add('synckit', () => {
    return require('./synckit.cjs')
  })

runAndPrint(loadBench)

console.log('Execution time')
const hotBench = new Benchmark.Suite()
hotBench
  .add('native', () => {
    return nativeFn(__filename)
  })
  .add('sync-threads', () => {
    return syncThreadsFn(__filename)
  })
  .add('synckit', () => {
    return synckitFn(__filename)
  })

runAndPrint(hotBench)

console.log('Total time')
const totalBench = new Benchmark.Suite()
totalBench
  .add('native', () => {
    const fn = require('./native.cjs')
    return fn(__filename)
  })
  .add('sync-threads', () => {
    const fn = require('./sync-threads.cjs')
    return fn(__filename)
  })
  .add('synckit', () => {
    const fn = require('./synckit.cjs')
    return fn(__filename)
  })

runAndPrint(totalBench)
