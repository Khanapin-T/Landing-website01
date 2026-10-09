import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { restClock } from '../../config/gold'
import { content } from '../../content'
import { addCue } from '../../story/cues'
import { story } from '../../story/store'
import { GOLD_BEATS } from './beats'
import { gold } from './state'

gsap.registerPlugin(useGSAP)

/**
 * "REST 00:00" counting up to 10:00 (gold.rest). State-based on a cue, like the printer chip: it appears when the
 * rest starts, the clock is written from the GSAP ticker only while shown and only when the text changes. Lives inside
 * Act 5's ActCopy, so the column's fade-out hides it too. The gold dot is the accent.
 */
export function RestChip() {
  const chip = useRef<HTMLDivElement>(null)
  const time = useRef<HTMLSpanElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const el = chip.current!
      const timeEl = time.current!
      gsap.set(el, { autoAlpha: 0 })

      let shown = ''
      const tick = () => {
        const text = restClock(gold.rest)
        if (text === shown) return
        shown = text
        timeEl.textContent = text
      }

      let on = false
      const sync = contextSafe!(() => {
        const next = story.screen >= GOLD_BEATS.steps.rest && story.screen < GOLD_BEATS.copyOut
        if (next === on) return
        on = next
        if (next) {
          shown = ''
          tick()
          gsap.ticker.add(tick)
        } else {
          gsap.ticker.remove(tick)
        }
        gsap.to(el, { autoAlpha: next ? 1 : 0, duration: 0.25, overwrite: true })
      })

      sync()
      const offs = [GOLD_BEATS.steps.rest, GOLD_BEATS.copyOut].map((at) => addCue({ at, enter: sync, leaveBack: sync }))
      return () => {
        offs.forEach((off) => off())
        gsap.ticker.remove(tick)
        gsap.killTweensOf(el)
        timeEl.textContent = ''
      }
    },
    { scope: chip },
  )

  return (
    <div
      ref={chip}
      className="mt-8 inline-flex items-center gap-3 rounded-full border border-line/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-line"
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-gold" />
      <span>{content.gold.rest}</span>
      <span ref={time} className="tabular-nums text-mute" />
    </div>
  )
}
