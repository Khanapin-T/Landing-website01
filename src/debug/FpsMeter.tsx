import { useEffect, useRef } from 'react'
import { FpsWindow } from './fps'

declare global {
  interface Window {
    /** Debug-only FPS probe for Playwright measurements (?debug). */
    __fps?: { readonly avg: number; readonly low1: number; reset: () => void }
  }
}

/** Mount only with ?debug. Measures browser frames with rAF and paints twice a second; no React state. */
export function FpsMeter() {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const win = new FpsWindow(240)
    let last = performance.now()
    let lastPaint = 0
    let raf = 0
    const loop = (now: number) => {
      win.push(now - last)
      last = now
      if (now - lastPaint > 500 && el.current) {
        el.current.textContent = `${win.avg.toFixed(0)} fps / 1% low ${win.low1.toFixed(0)}`
        lastPaint = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    window.__fps = {
      get avg() {
        return win.avg
      },
      get low1() {
        return win.low1
      },
      reset: () => win.reset(),
    }
    return () => {
      cancelAnimationFrame(raf)
      delete window.__fps
    }
  }, [])

  return <div ref={el} className="pointer-events-none fixed left-3 top-3 z-40 font-mono text-xs text-line/80" />
}
