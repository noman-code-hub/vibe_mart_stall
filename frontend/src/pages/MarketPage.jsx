import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import { getStall, listMarketplace } from '../services/stallApi.js'
import MarketStallSlider from '../components/market/MarketStallSlider.jsx'
import StallFocusModal from '../components/market/StallFocusModal.jsx'

/**
 * Public marketplace — published stalls over the market background.
 * Clicking a stall opens a zoomed overlay (no separate detail page).
 */
export default function MarketPage() {
  const config = useRuntimeConfig()
  const [searchParams, setSearchParams] = useSearchParams()
  const [stalls, setStalls] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [focusStall, setFocusStall] = useState(null)
  /** Bumps on close so in-flight opens / deep-links cannot reopen the overlay. */
  const focusRequestRef = useRef(0)
  /** Blocks deep-link reopen until ?stall= is actually cleared from the URL. */
  const suppressDeepLinkRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await listMarketplace(config)
        if (!cancelled) setStalls(Array.isArray(data?.items) ? data.items : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load the market.')
          setStalls([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [config])

  const openStall = useCallback(
    async (stallOrId) => {
      const id = typeof stallOrId === 'object' ? stallOrId?.id : stallOrId
      if (!id) return

      suppressDeepLinkRef.current = false
      const requestId = ++focusRequestRef.current
      const fromList = stalls.find((item) => String(item.id) === String(id))
      if (fromList) {
        setFocusStall(fromList)
      } else if (typeof stallOrId === 'object') {
        setFocusStall(stallOrId)
      }

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('stall', String(id))
          return next
        },
        { replace: true }
      )

      // Prefer full stall payload when list item is thin
      if (!fromList?.products?.length) {
        try {
          const full = await getStall(config, id)
          if (focusRequestRef.current !== requestId) return
          setFocusStall(full)
        } catch {
          // Keep whatever we already opened
        }
      }
    },
    [config, setSearchParams, stalls]
  )

  const closeStall = useCallback(() => {
    suppressDeepLinkRef.current = true
    focusRequestRef.current += 1
    setFocusStall(null)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('stall')
        return next
      },
      { replace: true }
    )
  }, [setSearchParams])

  // Deep-link / legacy redirects: /market?stall=12
  useEffect(() => {
    const stallId = searchParams.get('stall')
    if (!stallId) {
      suppressDeepLinkRef.current = false
      return undefined
    }
    if (suppressDeepLinkRef.current || loading) return undefined
    if (focusStall && String(focusStall.id) === String(stallId)) return undefined

    const requestId = focusRequestRef.current
    let cancelled = false
    const cached = stalls.find((item) => String(item.id) === String(stallId))
    if (cached) {
      setFocusStall(cached)
      return undefined
    }

    getStall(config, stallId)
      .then((full) => {
        if (cancelled || focusRequestRef.current !== requestId || suppressDeepLinkRef.current) return
        setFocusStall(full)
      })
      .catch(() => {
        if (cancelled || focusRequestRef.current !== requestId) return
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.delete('stall')
            return next
          },
          { replace: true }
        )
      })

    return () => {
      cancelled = true
    }
  }, [config, focusStall, loading, searchParams, setSearchParams, stalls])

  return (
    <section className={`vm-page vm-page--market${focusStall ? ' is-stall-focus' : ''}`}>
      <div
        className={`vm-market-body${!loading && stalls.length === 0 && !error ? ' is-empty' : ''}`}
      >
        {error && <p className="vm-error vm-market-error">{error}</p>}

        {!loading && stalls.length === 0 && !error ? (
          <p className="vm-market-empty">No published stalls yet.</p>
        ) : (
          <MarketStallSlider stalls={stalls} loading={loading} onStallOpen={openStall} />
        )}
      </div>

      {focusStall ? <StallFocusModal stall={focusStall} onClose={closeStall} /> : null}
    </section>
  )
}
