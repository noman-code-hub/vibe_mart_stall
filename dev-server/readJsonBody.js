/**
 * JSON body reader for Vite Connect middleware and Vercel serverless.
 * Vercel often pre-parses JSON into `req.body` (stream already consumed).
 */
function parseObjectOrString(value) {
  if (value == null || value === '') return {}
  if (typeof value === 'object' && !Buffer.isBuffer(value) && !Array.isArray(value)) {
    return value
  }
  if (Array.isArray(value)) return {}
  const raw = Buffer.isBuffer(value) ? value.toString('utf8') : String(value)
  const trimmed = raw.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return {}
  return JSON.parse(trimmed)
}

function hasOwnBody(req) {
  return Object.prototype.hasOwnProperty.call(req, 'body') && req.body !== undefined
}

function isEmptyBody(body) {
  if (body == null) return true
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    return !String(body).replace(/^\uFEFF/, '').trim()
  }
  if (typeof body === 'object') {
    return Object.keys(body).length === 0
  }
  return false
}

export function readJsonBody(req) {
  // Prefer platform-parsed body (Vercel / some Node adapters).
  if (hasOwnBody(req) && !isEmptyBody(req.body)) {
    try {
      return Promise.resolve(parseObjectOrString(req.body))
    } catch {
      return Promise.reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
    }
  }

  // Empty pre-parsed body — still try the stream if it is readable.
  if (req.readableEnded || req.complete) {
    if (hasOwnBody(req)) {
      try {
        return Promise.resolve(parseObjectOrString(req.body))
      } catch {
        return Promise.reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    }
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
        const raw = Buffer.concat(chunks)
        if (raw.length === 0 && hasOwnBody(req) && !isEmptyBody(req.body)) {
          finish(resolve, parseObjectOrString(req.body))
          return
        }
        finish(resolve, parseObjectOrString(raw))
      } catch {
        finish(reject, Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    })
    req.on('error', (err) => finish(reject, err))
  })
}
