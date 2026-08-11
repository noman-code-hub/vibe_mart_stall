import { apiRequest } from './http.js'
import { MAX_FREE_STALLS, STALL_LIMIT_MESSAGE } from './stallPayload.js'

export { MAX_FREE_STALLS, STALL_LIMIT_MESSAGE }

export function listMarketplace(config, params = {}) {
  const query = new URLSearchParams(params).toString()
  return apiRequest(config, `marketplace${query ? `?${query}` : ''}`)
}

export function getStall(config, id) {
  return apiRequest(config, `stalls/${id}`)
}

export function listMyStalls(config) {
  return apiRequest(config, 'stalls/mine')
}

/** Returns { count, remaining, atLimit }. */
export async function getOwnedStallQuota(config) {
  const data = await listMyStalls(config)
  const items = Array.isArray(data?.items) ? data.items : []
  const count = items.length
  return {
    count,
    remaining: Math.max(0, MAX_FREE_STALLS - count),
    atLimit: count >= MAX_FREE_STALLS,
  }
}

export function createStall(config, payload) {
  return apiRequest(config, 'stalls', { method: 'POST', body: payload })
}

export function updateStall(config, id, payload) {
  return apiRequest(config, `stalls/${id}`, { method: 'PUT', body: payload })
}

export function deleteStall(config, id) {
  return apiRequest(config, `stalls/${id}`, { method: 'DELETE' })
}
