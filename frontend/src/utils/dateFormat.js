/**
 * Site-wide date display: DAY-MONTH-YEAR (e.g. 21-5-1980).
 * No leading zeros on day/month.
 */

function partsFromValue(value) {
  if (value == null || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      year: value.getFullYear(),
    }
  }

  const text = String(value).trim()
  if (!text) return null

  // ISO date or datetime: 1980-05-21 / 1980-05-21T12:00:00Z
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    }
  }

  // D-M-YYYY or D/M/YYYY or D.M.YYYY
  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (match) {
    return {
      day: Number(match[1]),
      month: Number(match[2]),
      year: Number(match[3]),
    }
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return {
      day: parsed.getDate(),
      month: parsed.getMonth() + 1,
      year: parsed.getFullYear(),
    }
  }

  return null
}

function isRealCalendarDate({ day, month, year }) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/** Format any date-like value as D-M-YYYY. Returns '' for empty; original string if unparseable. */
export function formatDisplayDate(value) {
  if (value == null || value === '') return ''
  const parts = partsFromValue(value)
  if (!parts || !isRealCalendarDate(parts)) {
    return String(value).trim()
  }
  return `${parts.day}-${parts.month}-${parts.year}`
}

/** True when value is a real calendar date (ISO or D-M-YYYY). */
export function isValidDisplayDate(value) {
  const parts = partsFromValue(value)
  return Boolean(parts && isRealCalendarDate(parts))
}

/** Normalize user input to D-M-YYYY when valid; otherwise trimmed string. */
export function normalizeDisplayDate(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return isValidDisplayDate(text) ? formatDisplayDate(text) : text
}
