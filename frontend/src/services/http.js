async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function apiRequest(config, path, options = {}) {
  const url = `${config.restBase.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
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
