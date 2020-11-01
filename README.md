# sync-threads

Make asynchronous calls in Node.js synchronously using [worker threads](https://nodejs.org/api/worker_threads.html) and [Atomics semaphores](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics).

Especially useful when you need to resolve promises at require-time,
for example in an AWS Lambda function when using [provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html#configuration-concurrency-provisioned).

NOTE: you don't need this library if you're happy with the overhead of creating a Node.js subprocess,
see the [Appendix](#appendix) for details.

# Example

This example shows how we can synchronously retrieve secrets from [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
at require-time – that is, before the init stage of Lambda has finished.

`index.js`:

```js
const { createSyncFn } = require('sync-threads')

// Create our synchronous function
const getSsmSecretSync = createSyncFn('./worker.js')

// Call it at init (require) time, no async needed!
const secret = getSsmSecretSync('/my-secret')

// Logged at init time
console.log({ secret, source: 'init' })

exports.handler = async () => {
  // This value can be used in our handler without needing to resolve anything async
  console.log({ secret, source: 'handler' })
}
```

`worker.js`:

```js
const SSM = require('aws-sdk/clients/ssm')
const { runAsWorker } = require('sync-threads')

const ssm = new SSM()

runAsWorker(async (ssmParamName) => {
  const {
    Parameter: { Value },
  } = await ssm.getParameter({ Name: ssmParamName, WithDecryption: true }).promise()
  return Value
})
```

You can see this example, as well as how you'd bundle it if you're using webpack or similar, in the [`examples`](./examples) directory.

# API

`sync-threads` exports two main functions: `createSyncFn` and `runAsWorker`

## `createSyncFn(filename[, bufferSize])`

Returns a synchronous function that will run the specified file as a worker, serialize and pass in the first argument you give it, and wait for the result.

By default uses a `bufferSize` of `64 * 1024` (64kb) to share with the worker process – you'll want to increase this if you need larger result objects or strings.

```js
const { createSyncFn } = require('sync-threads')
const mySyncFn = createSyncFn('./worker.js')

// Will serialize the arg and pass it to the worker thread
mySyncFn({ some: 'input', data: true })
```

## `runAsWorker(workerAsyncFn)`

To be called from inside your worker code. It will run the given asynchronous function with the given arguments from the parent, serialize the result to the shared buffer and notify the parent.

```js
const { runAsWorker } = require('sync-threads')

// Takes the same arg as you pass to your sync function
runAsWorker(async ({ some, data }) => {
  return { some: 'result' }
})
```

# Installation

With [npm](http://npmjs.org/) do:

```
npm install sync-threads
```

# Appendix

You can achieve something very similar to this library using the
`spawnSync`/`execSync` functions from the `child_process` module in Node.js.

The main difference is that this library performs the async work in a thread, without creating a separate `node` process,
which makes it a little faster.

Here's a simple example of how you'd do it without needing this library:

`index.js`:

```js
const { execSync } = require('child_process')

const { secret } = JSON.parse(execSync('node worker.js /my-secret', 'utf8').trim().split('\n').pop())

console.log({ secret, source: 'init' })

exports.handler = async () => {
  console.log({ secret, source: 'handler' })
}
```

`worker.js`:

```js
const SSM = require('aws-sdk/clients/ssm')

const ssm = new SSM()

;(async () => {
  const {
    Parameter: { Value },
  } = await ssm.getParameter({ Name: process.argv[2], WithDecryption: true }).promise()
  process.stdout.write('\n' + JSON.stringify({ secret: Value }))
})()
```
