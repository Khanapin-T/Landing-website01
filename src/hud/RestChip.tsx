import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { content } from '../content'
import { addCue } from '../story/cues'
import { story } from '../story/store'
import { restClock } from './restClock'

gsap.registerPlugin(useGSAP)

export interface RestChipProps {
  /** Current rest progress 0..1, read from the GSAP ticker only while the chip is shown. */
  read: () => number
  /** Length of the whole timer in seconds (the clock runs 00:00 up to it). */
  seconds: number
  /** The chip is shown for story.screen in [showFrom, showTo). Static: read once at mount. */
  showFrom: number
  showTo: number
}

/**
 * "REST 00:00" counting up (Acts 3 and 5: the investment thickens, the gold rests). State-based on a cue, like the
 * printer chip: it appears when the rest starts and goes at `showTo`; the clock is written from the GSAP ticker only
 * while shown and only when the text changes. Lives inside an act's ActCopy, so the column's fade-out hides it too.
 * The gold dot is the accent.
 */
export function RestChip({ read, seconds, showFrom, showTo }: RestChipProps) {
  const chip = useRef<HTMLDivElement>(null)
  const time = useRef<HTMLSpanElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const el = chip.current!
      const timeEl = time.current!
      gsap.set(el, { autoAlpha: 0 })

      let shown = ''
      const tick = () => {
        const text = restClock(read(), seconds)
        if (text === shown) return
        shown = text
        timeEl.textContent = text
      }

      let on = false
      const sync = contextSafe!(() => {
        const next = story.screen >= showFrom && story.screen < showTo
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
      const offs = [showFrom, showTo].map((at) => addCue({ at, enter: sync, leaveBack: sync }))
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
      <span>{content.rest}</span>
      <span ref={time} className="tabular-nums text-mute" />
    </div>
  )
}
