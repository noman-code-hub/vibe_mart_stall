import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'vibe-mart-trolley-v1'
const TrolleyContext = createContext(null)

function readStoredItems() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function itemKey(item) {
  return `${item.stallId ?? 'stall'}:${item.productId ?? item.name}`
}

export function TrolleyProvider({ children }) {
  const [items, setItems] = useState(() =>
    typeof window === 'undefined' ? [] : readStoredItems()
  )

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, [items])

  const addItem = useCallback((product, stall = null) => {
    if (!product) return null

    const images = (
      Array.isArray(product.image_urls) && product.image_urls.length
        ? product.image_urls
        : Array.isArray(product.images) && product.images.length
          ? product.images
          : [product.image_url || product.image]
    )
      .map((item) => (typeof item === 'string' ? item : item?.url || item?.src || ''))
      .filter(Boolean)

    const nextItem = {
      key: '',
      productId: product.id ?? product.name ?? Date.now(),
      stallId: stall?.id ?? product.stall_id ?? null,
      stallName: stall?.business_name || stall?.title || product.stall_name || '',
      name: product.name || product.title || 'Product',
      price: product.price || '',
      size: product.variation || product.condition || product.label || '',
      description: product.description || '',
      image: images[0] || '',
      quantity: 1,
    }
    nextItem.key = itemKey(nextItem)

    setItems((prev) => {
      const existing = prev.find((item) => item.key === nextItem.key)
      if (existing) {
        return prev.map((item) =>
          item.key === nextItem.key
            ? { ...item, quantity: Number(item.quantity || 1) + 1 }
            : item
        )
      }
      return [...prev, nextItem]
    })

    return nextItem
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }, [])

  const setQuantity = useCallback((key, quantity) => {
    const nextQty = Math.max(1, Math.min(99, Number(quantity) || 1))
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, quantity: nextQty } : item))
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
    [items]
  )

  const value = useMemo(
    () => ({ items, count, addItem, removeItem, setQuantity, clear }),
    [items, count, addItem, removeItem, setQuantity, clear]
  )

  return <TrolleyContext.Provider value={value}>{children}</TrolleyContext.Provider>
}

export function useTrolley() {
  const ctx = useContext(TrolleyContext)
  if (!ctx) throw new Error('useTrolley must be used within TrolleyProvider')
  return ctx
}
