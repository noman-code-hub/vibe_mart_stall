import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
              <MarketStall {...props} className="vm-market-stall" />
            </Suspense>
          </div>
        </div>
      </button>
    </article>
  )
}

/**
 * Market stall slider — 2 full stalls visible at a time.
 * Each card scales the whole stall (art + text) together so proportions stay correct.
 */
export default function MarketStallSlider({ stalls = [], loading = false, onStallOpen }) {
  const railRef = useRef(null)
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(stalls.length / 2))

  const scrollToPage = (nextPage) => {
    const node = railRef.current
    if (!node) return
    const clamped = Math.max(0, Math.min(nextPage, pageCount - 1))
    node.scrollTo({ left: node.clientWidth * clamped, behavior: 'smooth' })
    setPage(clamped)
  }

  useEffect(() => {
    const node = railRef.current
    if (!node || stalls.length === 0) return undefined

    const onScroll = () => {
      const next = Math.round(node.scrollLeft / Math.max(1, node.clientWidth))
      setPage(Math.max(0, Math.min(next, pageCount - 1)))
    }

    node.addEventListener('scroll', onScroll, { passive: true })
    return () => node.removeEventListener('scroll', onScroll)
  }, [stalls.length, pageCount])

  if (loading) {
    return (
      <div className="vm-market-loading">
        <StallLoadingScreen />
      </div>
    )
  }

  return (
    <div className="vm-market-slider">
      <div className="vm-market-slider__chrome">
        <button
          type="button"
          className="vm-btn vm-btn--ghost"
          onClick={() => scrollToPage(page - 1)}
          disabled={page <= 0}
          aria-label="Previous stalls"
        >
          ←
        </button>
        <button
          type="button"
          className="vm-btn vm-btn--ghost"
          onClick={() => scrollToPage(page + 1)}
          disabled={page >= pageCount - 1}
          aria-label="Next stalls"
        >
          →
        </button>
      </div>

      <div
        className="vm-market-rail"
        ref={railRef}
        tabIndex={0}
        role="region"
        aria-label="Published market stalls"
      >
        {stalls.map((stall) => (
          <StallCard key={stall.id} stall={stall} onOpen={onStallOpen} />
        ))}
      </div>

      {pageCount > 1 && (
        <div className="vm-market-dots" role="tablist" aria-label="Stall pages">
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              className={`vm-market-dots__dot${index === page ? ' is-active' : ''}`}
              aria-label={`Show stalls page ${index + 1}`}
              aria-selected={index === page}
              onClick={() => scrollToPage(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
