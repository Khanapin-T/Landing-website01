import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { content } from '../../content'
import { addCue } from '../../story/cues'
import { story } from '../../story/store'
import { GOLD_BEATS } from './beats'
import { GAUGE, needleAngle, tickLines } from './gauge'
import { gold } from './state'

gsap.registerPlugin(useGSAP)

const TICKS = tickLines()

/**
 * The vacuum gauge in the top right corner (SVG, white and blue-grey with a gold needle: gold is the accent from
 * Act 5 on). It fades in and out on cues (state-based, so a chapter jump lands in the right state); the needle
 * follows gold.vacuum from the GSAP ticker, written only while the gauge is shown and only when the angle changes.
 */
export function VacuumGauge() {
  const root = useRef<HTMLDivElement>(null)
  const needle = useRef<SVGGElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const el = root.current!
      const needleEl = needle.current!
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      gsap.set(el, { autoAlpha: 0 })

      let shown = Number.NaN
      const tick = () => {
        const deg = needleAngle(gold.vacuum)
        if (Math.abs(deg - shown) < 0.05) return
        shown = deg
        needleEl.setAttribute('transform', `rotate(${deg.toFixed(2)} ${GAUGE.center} ${GAUGE.center})`)
      }

      let on = false
      const sync = contextSafe!(() => {
        const next = story.screen >= GOLD_BEATS.gaugeIn && story.screen < GOLD_BEATS.gaugeOut
        if (next === on) return
        on = next
        if (next) {
          shown = Number.NaN
          tick()
          gsap.ticker.add(tick)
        } else {
          gsap.ticker.remove(tick)
        }
        gsap.to(el, { autoAlpha: next ? 1 : 0, duration: reduce ? 0.2 : 0.5, ease: 'power2.out', overwrite: true })
      })

      sync()
      const offs = [GOLD_BEATS.gaugeIn, GOLD_BEATS.gaugeOut].map((at) => addCue({ at, enter: sync, leaveBack: sync }))
      return () => {
        offs.forEach((off) => off())
        gsap.ticker.remove(tick)
        gsap.killTweensOf(el)
      }
    },
    { scope: root },
  )

  return (
    <div ref={root} className="pointer-events-none absolute right-[8vw] top-[9vh] w-[min(11vw,170px)] text-line" role="img" aria-label={content.gold.gauge}>
      <svg viewBox="0 0 160 160" className="block w-full" aria-hidden="true">
        <circle cx={GAUGE.center} cy={GAUGE.center} r="74" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
        {TICKS.map((t, i) => (
          <line key={i} {...t} stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.5" />
        ))}
        <g ref={needle} transform={`rotate(${GAUGE.startDeg} ${GAUGE.center} ${GAUGE.center})`}>
          <line x1={GAUGE.center} y1={GAUGE.center} x2={GAUGE.center} y2={GAUGE.center - GAUGE.needle} className="stroke-gold" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx={GAUGE.center} cy={GAUGE.center} r="4" className="fill-gold" />
      </svg>
      <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-mute">{content.gold.gauge}</p>
    </div>
  )
}
