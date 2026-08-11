async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function buildApiUrl(restBase, path) {
  const base = String(restBase || '').replace(/\/$/, '')
  const cleanPath = String(path || '').replace(/^\//, '')
  const onVercel =
    typeof window !== 'undefined' && /\.vercel\.app$/i.test(window.location.hostname || '')

  // Flat Vercel function — also forced on *.vercel.app even if an old bundle
  // still thinks restBase is /wp-json/...
  const useVmQuery = onVercel || base === '/api/vm' || base.endsWith('/api/vm')

  if (useVmQuery) {
    const url = new URL('/api/vm', typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    url.searchParams.set('path', cleanPath)
    return `${url.pathname}?${url.searchParams.toString()}`
  }

  return `${base}/${cleanPath}`
}

export async function apiRequest(config, path, options = {}) {
  const url = buildApiUrl(config.restBase, path)
  const headers = {
    Accept: 'application/json',
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(config.nonce ? { 'X-WP-Nonce': config.nonce } : {}),
    ...options.headers,
  }

  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData) && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  })

  const data = await parseJson(response)
  if (!response.ok) {
    const message =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error) ||
      `Request failed (${response.status})`
    const error = new Error(message.replace(/<[^>]+>/g, ''))
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
