import { useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { content } from '../content'
import { useAppState } from '../story/appState'

const W = 560

/** Loader: a dimension line whose length is the load progress. Fades out on ready; shows a retry on error. */
export function Loader() {
  const { progress } = useProgress()
  const { phase } = useAppState()
  const root = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)

  useGSAP(
    () => {
      if (phase !== 'ready' || !root.current) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      gsap.to(root.current, { autoAlpha: 0, duration: reduce ? 0 : 0.8, ease: 'power2.out', onComplete: () => setGone(true) })
    },
    { dependencies: [phase] },
  )

  if (gone) return null
  const p = Math.round(progress)
  const x = (W * p) / 100

  return (
    <div ref={root} className="fixed inset-0 z-30 grid place-items-center bg-ink">
      {phase === 'error' ? (
        <div className="text-center">
          <p role="alert" className="text-lg text-line">{content.loader.error}</p>
          <button
            type="button"
            className="mt-6 border border-line/40 px-5 py-2 font-mono text-sm text-line transition hover:border-line focus-visible:outline focus-visible:outline-1 focus-visible:outline-line active:scale-[0.98]"
            onClick={() => window.location.reload()}
          >
            {content.loader.retry}
          </button>
        </div>
      ) : (
        <div
          className="w-[min(560px,70vw)]"
          role="progressbar"
          aria-label={content.loader.line}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={p}
        >
          <svg viewBox={`0 -2 ${W} 44`} className="w-full overflow-visible text-line" aria-hidden="true">
            <line x1="0" y1="8" x2="0" y2="32" stroke="currentColor" strokeWidth="1" />
            <line x1="0" y1="20" x2={x} y2="20" stroke="currentColor" strokeWidth="1" />
            <line x1={x} y1="8" x2={x} y2="32" stroke="currentColor" strokeWidth="1" />
          </svg>
          <div className="mt-3 flex justify-between font-mono text-xs text-mute">
            <span>{content.loader.heightLabel}</span>
            <span>{p}%</span>
          </div>
          <p className="mt-8 text-sm text-line/80">{content.loader.line}</p>
        </div>
      )}
    </div>
  )
}
