/**
 * JSON body reader for Vite Connect middleware and Vercel serverless.
 * Vercel often pre-parses JSON into `req.body` (stream already consumed).
 */
export function readJsonBody(req) {
  if (req.body != null && req.body !== '') {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return Promise.resolve(req.body)
    }
    if (Buffer.isBuffer(req.body)) {
      const raw = req.body.toString('utf8')
      if (!raw) return Promise.resolve({})
      try {
        return Promise.resolve(JSON.parse(raw))
      } catch {
        return Promise.reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    }
    if (typeof req.body === 'string') {
      if (!req.body) return Promise.resolve({})
      try {
        return Promise.resolve(JSON.parse(req.body))
      } catch {
        return Promise.reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    }
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    let settled = false

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      fn(value)
    }

    // Vercel/Node may have no stream data left.
    const timer = setTimeout(() => finish(resolve, {}), 50)

    req.on('data', (chunk) => {
      clearTimeout(timer)
      chunks.push(chunk)
    })
    req.on('end', () => {
      clearTimeout(timer)
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        finish(resolve, {})
        return
      }
      try {
        finish(resolve, JSON.parse(raw))
      } catch {
        finish(reject, Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    })
    req.on('error', (err) => {
      clearTimeout(timer)
      finish(reject, err)
    })
  })
}
