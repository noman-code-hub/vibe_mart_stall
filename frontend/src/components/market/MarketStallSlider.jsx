import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { stallToMarketStallProps } from '../../services/stallDisplay.js'
import StallLoadingScreen from '../StallLoadingScreen.jsx'

const MarketStall = lazy(() => import('../MarketStall'))

/** Native stall art width — cards render at this size then scale down as one piece. */
const STALL_DESIGN_WIDTH = 1024
const STALL_DESIGN_HEIGHT = 576

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
 * Swipe horizontally to move between stalls.
 */
export default function MarketStallSlider({ stalls = [], loading = false, onStallOpen }) {
  if (loading) {
    return (
      <div className="vm-market-loading">
        <StallLoadingScreen />
      </div>
    )
  }

  return (
    <div className="vm-market-slider">
      <div
        className="vm-market-rail"
        tabIndex={0}
        role="region"
        aria-label="Published market stalls"
      >
        {stalls.map((stall) => (
          <StallCard key={stall.id} stall={stall} onOpen={onStallOpen} />
        ))}
      </div>
    </div>
  )
}
