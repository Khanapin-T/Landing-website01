import { useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { SplitText } from 'gsap/SplitText'
import { addCue } from '../story/cues'
import { story } from '../story/store'

gsap.registerPlugin(useGSAP, SplitText)

export interface ActCopyProps {
  /** Accessible name of the section (the act name). */
  label: string
  heading: string
  caption: string
  /** Absolute screens: the column reveals at `copyIn` and leaves at `copyOut`. */
  copyIn: number
  copyOut: number
  /** Act-specific content rendered after the caption, inside the animated block. */
  children?: ReactNode
  /**
   * Adds act-specific steps to the reveal timeline. Called inside every `onSplit` (initial split and each
   * re-split), after the heading and caption steps, also under reduced motion (then use the shared 0.2 s fade).
   */
  extendReveal?: (tl: gsap.core.Timeline, root: HTMLElement, reduce: boolean) => void
}

/**
 * The left copy column of an act: heading, caption and optional extras. Cue-driven, time-based reveals
 * (never scrubbed). Props are read once at mount; they are static per act.
 */
export function ActCopy({ label, heading, caption, copyIn, copyOut, children, extendReveal }: ActCopyProps) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const el = root.current!
      const headingEl = el.querySelector('h2')!
      const captionEl = el.querySelector('[data-caption]')!
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Which way the reveal should currently run. A re-split (font load / resize) builds a fresh paused
      // timeline and SplitText only syncs its time, so `drive` re-applies the direction afterwards.
      let want: 'idle' | 'fwd' | 'rev' = 'idle'
      let reveal = gsap.timeline({ paused: true })

      const drive = () => {
        if (want === 'fwd' && reveal.progress() < 1) reveal.timeScale(1).play()
        else if (want === 'rev' && reveal.progress() > 0) reveal.timeScale(2).reverse()
      }

      const split = SplitText.create(headingEl, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit(self) {
          reveal = gsap.timeline({ paused: true })
          if (reduce) {
            reveal.from([headingEl, captionEl], { autoAlpha: 0, duration: 0.2 }, 0)
          } else {
            reveal
              .from(self.lines, { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0)
              .from(captionEl, { autoAlpha: 0, y: 12, duration: 0.6, ease: 'power2.out' }, 0.25)
          }
          extendReveal?.(reveal, el, reduce)
          // Runs after SplitText has synced the returned timeline's time.
          queueMicrotask(drive)
          return reveal
        },
      })

      const fadeOut = contextSafe!(() => {
        gsap.to(el, { autoAlpha: 0, y: reduce ? 0 : -16, duration: reduce ? 0.2 : 0.4, ease: 'power2.in', overwrite: 'auto' })
      })
      const fadeBack = contextSafe!(() => {
        // Jumped back above copyIn in one update (Home key, chapter click): the copy must end hidden,
        // so reset the reveal silently instead of fading the column in while it reverses.
        if (story.screen < copyIn) {
          want = 'idle'
          reveal.pause(0)
          gsap.set(el, { autoAlpha: 1, y: 0, overwrite: true })
          return
        }
        gsap.to(el, { autoAlpha: 1, y: 0, duration: reduce ? 0.2 : 0.5, ease: 'power2.out', overwrite: 'auto' })
      })

      const offIn = addCue({
        at: copyIn,
        enter: () => {
          want = 'fwd'
          // Jumped straight past copyOut: finish silently, the column ends hidden.
          if (story.screen >= copyOut) {
            reveal.progress(1).pause()
            gsap.set(el, { autoAlpha: 0, y: reduce ? 0 : -16, overwrite: true })
            return
          }
          drive()
        },
        leaveBack: () => {
          want = 'rev'
          drive()
        },
      })
      const offOut = addCue({ at: copyOut, enter: fadeOut, leaveBack: fadeBack })

      return () => {
        offIn()
        offOut()
        want = 'idle'
        split.revert()
        gsap.killTweensOf(el)
        gsap.set(el, { clearProps: 'opacity,visibility,transform' })
      }
    },
    { scope: root },
  )

  // The outer section only positions (flex centering, no transform) so GSAP's y tween on the inner block
  // cannot freeze a Tailwind translate into pixels.
  return (
    <section
      aria-label={label}
      className="pointer-events-none absolute inset-y-0 left-[7vw] flex w-[min(32vw,480px)] items-center"
    >
      <div ref={root}>
        <h2 className="text-[clamp(40px,4vw,68px)] font-semibold leading-[0.98] tracking-[-0.01em] text-line" style={{ fontStretch: '125%' }}>
          {heading}
        </h2>
        <p data-caption className="mt-6 max-w-[38ch] text-[17px] leading-relaxed text-line/80">
          {caption}
        </p>
        {children}
      </div>
    </section>
  )
}
