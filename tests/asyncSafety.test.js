const assert = require('assert')
const { safeAsyncRequest, RequestTimeoutError } = require('../utils/safeAsyncRequest.js')
const { safeJsonParse } = require('../utils/safeJsonParse.js')

function run(name, fn) {
  Promise.resolve()
    .then(fn)
    .then(() => console.log('PASS', name))
    .catch(error => {
      console.error('FAIL', name)
      throw error
    })
}

run('safeJsonParse handles valid JSON', () => {
  const out = safeJsonParse('{"ok":true,"value":3}')
  assert.strictEqual(out.ok, true)
  assert.strictEqual(out.data.value, 3)
})

run('safeJsonParse handles invalid JSON', () => {
  const out = safeJsonParse('{broken')
  assert.strictEqual(out.ok, false)
  assert.ok(String(out.error.message).includes('Invalid JSON'))
})

run('safeAsyncRequest success path executes callbacks', async () => {
  const calls = []
  const result = await safeAsyncRequest(async () => {
    calls.push('request')
    return { done: true }
  }, {
    onStart: () => calls.push('start'),
    onSuccess: () => calls.push('success'),
    onFinally: () => calls.push('finally')
  })

  assert.strictEqual(result.ok, true)
  assert.deepStrictEqual(calls, ['start', 'request', 'success', 'finally'])
})

run('safeAsyncRequest timeout returns RequestTimeoutError and always finally', async () => {
  const calls = []
  const result = await safeAsyncRequest(async signal => {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 80)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      }, { once: true })
    })
    return { done: true }
  }, {
    timeoutMs: 10,
    onStart: () => calls.push('start'),
    onError: error => {
      calls.push('error')
      assert.ok(error instanceof RequestTimeoutError)
    },
    onFinally: () => calls.push('finally')
  })

  assert.strictEqual(result.ok, false)
  assert.ok(result.error instanceof RequestTimeoutError)
  assert.deepStrictEqual(calls, ['start', 'error', 'finally'])
})
