import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { stallToMarketStallProps } from '../../services/stallDisplay.js'
import StallLoadingScreen from '../StallLoadingScreen.jsx'

const MarketStall = lazy(() => import('../MarketStall'))

/** Native stall art width — cards render at this size then scale down as one piece. */
const STALL_DESIGN_WIDTH = 1024
const STALL_DESIGN_HEIGHT = 576
const AUTO_SLIDE_MS = 4200

function StallCard({ stall, onOpen }) {
  const props = stallToMarketStallProps(stall)
  const frameRef = useRef(null)
  const [scale, setScale] = useState(0.45)

  useLayoutEffect(() => {
    const node = frameRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined

    const update = () => {
      const width = node.clientWidth
      if (!width) return
      setScale(width / STALL_DESIGN_WIDTH)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  if (!props) return null

  return (
    <article className="vm-market-rail__item" id={`stall-${stall.id}`}>
      <button
        type="button"
        className="vm-market-rail__hit"
        aria-label={`Open ${props.businessName || 'stall'}`}
        onClick={() => onOpen?.(stall)}
      >
        <div
          className="vm-market-scale"
          ref={frameRef}
          style={{ aspectRatio: `${STALL_DESIGN_WIDTH} / ${STALL_DESIGN_HEIGHT}` }}
        >
          <div
            className="vm-market-scale__inner"
            style={{
              width: STALL_DESIGN_WIDTH,
              height: STALL_DESIGN_HEIGHT,
              transform: `scale(${scale})`,
            }}
          >
            <Suspense fallback={<StallLoadingScreen />}>
              <MarketStall {...props} variant="market" className="vm-market-stall" />
            </Suspense>
          </div>
        </div>
      </button>
    </article>
  )
}

/**
 * Market stall slider — one full stall visible at a time.
 * Each card scales the whole stall (art + text) together so proportions stay correct.
 * Auto-slides between published stalls; swipe still works.
 */
export default function MarketStallSlider({
  stalls = [],
  loading = false,
  onStallOpen,
  paused = false,
}) {
  const railRef = useRef(null)
  const indexRef = useRef(0)
  const holdRef = useRef(false)

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return undefined

    const syncIndex = () => {
      const width = rail.clientWidth
      if (!width) return
      indexRef.current = Math.round(rail.scrollLeft / width) % Math.max(stalls.length, 1)
    }

    rail.addEventListener('scroll', syncIndex, { passive: true })
    return () => rail.removeEventListener('scroll', syncIndex)
  }, [loading, stalls.length])

  useEffect(() => {
    if (loading || paused || stalls.length < 2) return undefined
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined
    }

    const id = window.setInterval(() => {
      if (holdRef.current) return
      const rail = railRef.current
      if (!rail) return
      const width = rail.clientWidth
      if (!width) return
      const next = (indexRef.current + 1) % stalls.length
      indexRef.current = next
      rail.scrollTo({ left: next * width, behavior: 'smooth' })
    }, AUTO_SLIDE_MS)

    return () => window.clearInterval(id)
  }, [loading, paused, stalls.length])

  if (loading) {
    return (
      <div className="vm-market-loading">
        <StallLoadingScreen />
      </div>
    )
  }

  const hold = () => {
    holdRef.current = true
  }
  const release = () => {
    holdRef.current = false
  }

  return (
    <div className="vm-market-slider">
      <div
        ref={railRef}
        className="vm-market-rail"
        tabIndex={0}
        role="region"
        aria-label="Published market stalls"
        onPointerEnter={hold}
        onPointerLeave={release}
        onFocus={hold}
        onBlur={release}
        onTouchStart={hold}
        onTouchEnd={release}
      >
        {stalls.map((stall) => (
          <StallCard key={stall.id} stall={stall} onOpen={onStallOpen} />
        ))}
      </div>
    </div>
  )
}
