(function (root, factory) {
  const api = factory()
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api
  }
  root.SafeJsonUtils = api
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  function safeJsonParse(raw) {
    try {
      return { ok: true, data: JSON.parse(raw) }
    } catch (error) {
      const message = error && error.message ? error.message : 'parse error'
      return { ok: false, error: new Error(`Invalid JSON: ${message}`) }
    }
  }

  return { safeJsonParse }
})
