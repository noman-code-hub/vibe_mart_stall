/**
 * JSON body reader for Vite Connect middleware and Vercel serverless.
 * Vercel often pre-parses JSON into `req.body` (stream already consumed).
 */
function parseObjectOrString(value) {
  if (value == null || value === '') return {}
  if (typeof value === 'object' && !Buffer.isBuffer(value)) return value
  const raw = Buffer.isBuffer(value) ? value.toString('utf8') : String(value)
  const trimmed = raw.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return {}
  return JSON.parse(trimmed)
}

export function readJsonBody(req) {
  // Prefer platform-parsed body (Vercel / some Node adapters).
  if (Object.prototype.hasOwnProperty.call(req, 'body') && req.body !== undefined) {
    try {
      return Promise.resolve(parseObjectOrString(req.body))
    } catch {
      return Promise.reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
    }
  }

  // Stream already finished with nothing left to read.
  if (req.readableEnded || req.complete) {
    return Promise.resolve({})
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    let settled = false

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      fn(value)
    }

    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        finish(resolve, parseObjectOrString(Buffer.concat(chunks)))
      } catch {
        finish(reject, Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    })
    req.on('error', (err) => finish(reject, err))
  })
}
