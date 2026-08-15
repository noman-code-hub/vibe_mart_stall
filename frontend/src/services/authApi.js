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

export function confirmEmail(config, { login, token }) {
  return apiRequest(config, 'auth/confirm-email', {
    method: 'POST',
    body: { login, token },
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

export function requestPasswordReset(config, username) {
  return apiRequest(config, 'auth/forgot-password', {
    method: 'POST',
    body: { username },
  })
}

export function resetPassword(config, { login, token, password }) {
  return apiRequest(config, 'auth/reset-password', {
    method: 'POST',
    body: { login, token, password },
  })
}
