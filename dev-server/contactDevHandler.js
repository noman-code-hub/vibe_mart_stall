/**
 * Local contact form API mirroring POST `/wp-json/vibe-mart/v1/contact`.
 * Used by Vite dev middleware and Vercel `/api/vm?path=contact`.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getLocalDataDir } from './localDataDir.js'
import { readJsonBody } from './readJsonBody.js'

const DATA_DIR = getLocalDataDir()
const CONTACT_FILE = path.join(DATA_DIR, 'contact-submissions.json')
const API_PREFIX = '/wp-json/vibe-mart/v1'

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function loadSubmissions() {
  try {
    const raw = await readFile(CONTACT_FILE, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data?.submissions) ? data.submissions : []
  } catch {
    return []
  }
}

async function saveSubmissions(submissions) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(CONTACT_FILE, JSON.stringify({ submissions }, null, 2), 'utf8')
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

/**
 * @returns {Promise<boolean>}
 */
export default async function contactDevHandler(req, res) {
  const urlPath = req.url?.split('?')[0] || ''
  if (urlPath !== `${API_PREFIX}/contact`) {
    return false
  }

  const method = (req.method || 'GET').toUpperCase()
  if (method !== 'POST') {
    sendJson(res, 405, { code: 'vibe_mart_method', message: 'Method not allowed.' })
    return true
  }

  try {
    const body = await readJsonBody(req)

    if (String(body.website || '').trim()) {
      sendJson(res, 200, { ok: true, message: 'Thanks — your message was sent.' })
      return true
    }

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = String(body.phone || '').trim()
    const message = String(body.message || '').trim()
    const comments = String(body.comments || '').trim()

    if (!name || !isValidEmail(email)) {
      sendJson(res, 400, {
        code: 'vibe_mart_contact_invalid',
        message: 'Enter your name and a valid email address.',
      })
      return true
    }

    if (!message && !comments) {
      sendJson(res, 400, {
        code: 'vibe_mart_contact_invalid',
        message: 'Please write a message or comment.',
      })
      return true
    }

    const submissions = await loadSubmissions()
    submissions.push({
      id: submissions.reduce((max, row) => Math.max(max, row.id || 0), 0) + 1,
      name,
      email,
      phone,
      message,
      comments,
      sent_at: new Date().toISOString(),
    })
    await saveSubmissions(submissions)

    sendJson(res, 200, { ok: true, message: 'Thanks — your message was sent.' })
    return true
  } catch (error) {
    console.error('[dev contact]', error)
    sendJson(res, error.status || 500, {
      code: 'vibe_mart_dev_error',
      message: error.message || 'Contact form failed.',
    })
    return true
  }
}
