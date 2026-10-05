import { useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { TextPlugin } from 'gsap/TextPlugin'
import { content } from '../../content'
import { addCue } from '../../story/cues'
import { story } from '../../story/store'
import { PRINT_BEATS } from './beats'
import { chipStateAt, type ChipState } from './chip'
import { print } from './state'

gsap.registerPlugin(useGSAP, TextPlugin)

const t = content.print.chip

/**
 * Border beam: a 1 px ring (padding + mask exclude) filled with a conic highlight whose start angle is the
 * `--beam` custom property. White/blue-grey only. Prefixed mask first so the standard shorthand wins.
 */
const BEAM_STYLE = {
  '--beam': '0',
  background: 'conic-gradient(from calc(var(--beam) * 1deg), transparent 0 70%, rgb(219 230 242 / 0.9) 85%, transparent 100%)',
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
} as CSSProperties

/**
 * "Sending to printer" -> "Printing 000%" -> "Printed". State-based on cues (like DimLabels), so a jump
 * across several cues lands in the right state without flashing. Lives inside Act 2's ActCopy, so the
 * column's fade-out hides it too.
 */
export function PrinterChip() {
  const chip = useRef<HTMLDivElement>(null)
  const beam = useRef<HTMLSpanElement>(null)
  const typed = useRef<HTMLSpanElement>(null)
  const live = useRef<HTMLSpanElement>(null)
  const pct = useRef<HTMLSpanElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const chipEl = chip.current!
      const beamEl = beam.current!
      const typedEl = typed.current!
      const liveEl = live.current!
      const pctEl = pct.current!
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      gsap.set(chipEl, { autoAlpha: 0 })
      gsap.set(beamEl, { autoAlpha: 0 })
      // Reduced motion: no beam at all, the static border stays.
      const spin = reduce ? null : gsap.to(beamEl, { '--beam': 360, duration: 2.4, ease: 'none', repeat: -1, paused: true })

      // Percent readout: written from the ticker, only while printing, only when the integer changes.
      let shownPct = -1
      let ticking = false
      const tick = () => {
        const p = Math.min(100, Math.max(0, Math.round(print.grow * 100)))
        if (p === shownPct) return
        shownPct = p
        pctEl.textContent = String(p).padStart(3, '0') + '%'
      }
      const startTicker = () => {
        if (ticking) return
        ticking = true
        shownPct = -1
        tick()
        gsap.ticker.add(tick)
      }
      const stopTicker = () => {
        if (!ticking) return
        ticking = false
        gsap.ticker.remove(tick)
      }

      const setBeam = (on: boolean) => {
        if (!spin) return
        if (on) spin.play()
        else spin.pause()
        // 'auto', not true: true would also kill the --beam spin on the same element.
        gsap.to(beamEl, { autoAlpha: on ? 1 : 0, duration: 0.3, overwrite: 'auto' })
      }

      const setLabel = (text: string, type: boolean) => {
        gsap.killTweensOf(typedEl)
        // The visible label types char by char; screen readers get the whole string once (see markup).
        liveEl.textContent = text
        if (type && !reduce) {
          typedEl.textContent = ''
          gsap.to(typedEl, { text: { value: text }, duration: 0.9, ease: 'none' })
        } else {
          typedEl.textContent = text
        }
      }

      // State-based, not edge-based: inside a cue callback story.screen is already the landing position.
      let state: ChipState = 'hidden'
      const sync = contextSafe!(() => {
        const next = chipStateAt(story.screen)
        if (next === state) return
        state = next
        if (next === 'printing') startTicker()
        else stopTicker()
        setBeam(next === 'printing')

        if (next === 'hidden') {
          gsap.to(chipEl, { autoAlpha: 0, duration: 0.25, overwrite: true })
          return
        }
        // Visible before the first label write, so screen readers do not drop the live announcement.
        gsap.set(chipEl, { visibility: 'inherit' })
        gsap.to(chipEl, { autoAlpha: 1, duration: 0.25, overwrite: true })
        if (next === 'sending') {
          setLabel(t.sending, true)
          pctEl.hidden = true
        } else if (next === 'printing') {
          setLabel(t.printing, false)
          pctEl.hidden = false
        } else {
          setLabel(t.done, false)
          pctEl.textContent = '100%'
          pctEl.hidden = false
        }
      })

      const offs = [PRINT_BEATS.chipIn, PRINT_BEATS.printFrom, PRINT_BEATS.printTo].map((at) =>
        addCue({ at, enter: sync, leaveBack: sync }),
      )

      return () => {
        offs.forEach((off) => off())
        stopTicker()
        spin?.kill()
        gsap.killTweensOf([chipEl, beamEl, typedEl])
        typedEl.textContent = ''
        liveEl.textContent = ''
        pctEl.textContent = ''
        pctEl.hidden = true
      }
    },
    { scope: chip },
  )

  return (
    <div
      ref={chip}
      className="relative mt-8 inline-flex items-center gap-3 rounded-full border border-line/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-line"
    >
      <span ref={beam} aria-hidden="true" className="pointer-events-none absolute -inset-px rounded-full p-px" style={BEAM_STYLE} />
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-line" />
      <span ref={typed} aria-hidden="true" />
      <span ref={live} aria-live="polite" className="sr-only" />
      <span ref={pct} hidden className="tabular-nums text-mute" />
    </div>
  )
}
