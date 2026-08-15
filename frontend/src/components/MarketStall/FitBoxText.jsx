import { useEffect, useRef } from 'react'

/**
 * Shrinks font size until the text fits inside its box (no overflow / overlay).
 */
export default function FitBoxText({
  as: Tag = 'p',
  className = '',
  children,
  maxPx = 14,
  minPx = 6,
  ...rest
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || children == null || children === '') return undefined

    const fit = () => {
      let size = maxPx
      el.style.fontSize = `${size}px`

      while (
        size > minPx &&
        (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
      ) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }

    fit()
    const frame = window.requestAnimationFrame(fit)
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    observer?.observe(el)
    if (el.parentElement) observer?.observe(el.parentElement)

    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [children, maxPx, minPx])

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}
