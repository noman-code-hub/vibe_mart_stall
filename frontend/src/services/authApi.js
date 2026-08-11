import { apiRequest } from './http.js'

export function login(config, username, password, remember = true) {
  return apiRequest(config, 'auth/login', {
    method: 'POST',
    body: { username, password, remember },
  })
}

export function register(config, payload) {
  return apiRequest(config, 'auth/register', {
    method: 'POST',
    body: payload,
  })
}

export function logout(config) {
  return apiRequest(config, 'auth/logout', { method: 'POST', body: {} })
}

/** Soft session check — returns { authenticated, user, nonce } without 401. */
export function getSession(config) {
  return apiRequest(config, 'auth/session')
}

export function getProfile(config) {
  return apiRequest(config, 'auth/profile')
}

export function updateProfile(config, payload) {
  return apiRequest(config, 'auth/profile', {
    method: 'PUT',
    body: payload,
  })
}
