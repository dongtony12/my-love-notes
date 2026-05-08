'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // dev 모드에선 스킵 — Turbopack hot reload와 캐시 충돌 방지
    if (process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[sw] register failed:', err)
    })
  }, [])

  return null
}
