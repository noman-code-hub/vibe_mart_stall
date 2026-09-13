const RETURN_KEY = 'vm_after_auth'

export function rememberAuthReturnTo(path) {
  const next = String(path || '').trim()
  if (!next) return
  try {
    sessionStorage.setItem(RETURN_KEY, next)
  } catch {
    // private mode / blocked storage
  }
}

export function peekAuthReturnTo() {
  try {
    return sessionStorage.getItem(RETURN_KEY) || ''
  } catch {
    return ''
  }
}

export function takeAuthReturnTo() {
  const value = peekAuthReturnTo()
  try {
    sessionStorage.removeItem(RETURN_KEY)
  } catch {
    // ignore
  }
  return value
}

export function currentAppPath(location) {
  if (!location) return '/'
  return `${location.pathname || '/'}${location.search || ''}`
}
