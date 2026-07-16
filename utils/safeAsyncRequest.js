(function (root, factory) {
  const api = factory()
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api
  }
  root.SafeAsyncUtils = api
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  class RequestTimeoutError extends Error {
    constructor(message = 'Request timed out') {
      super(message)
      this.name = 'RequestTimeoutError'
    }
  }

  async function safeAsyncRequest(requestFn, options) {
    const config = options || {}
    const timeoutMs = Number(config.timeoutMs || 30000)
    const onStart = config.onStart
    const onSuccess = config.onSuccess
    const onError = config.onError
    const onFinally = config.onFinally

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      if (typeof onStart === 'function') onStart()
      const data = await requestFn(controller.signal)
      if (typeof onSuccess === 'function') onSuccess(data)
      return { ok: true, data }
    } catch (err) {
      const error = err && err.name === 'AbortError'
        ? new RequestTimeoutError(`Request exceeded ${timeoutMs}ms`)
        : (err instanceof Error ? err : new Error('Unknown request error'))
      if (typeof onError === 'function') onError(error)
      return { ok: false, error }
    } finally {
      clearTimeout(timeoutId)
      if (typeof onFinally === 'function') onFinally()
    }
  }

  return {
    RequestTimeoutError,
    safeAsyncRequest
  }
})
