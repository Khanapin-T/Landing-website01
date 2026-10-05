import { Fragment, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { content } from '../../content'
import { addCue } from '../../story/cues'
import { IDEA_BEATS } from './beats'

gsap.registerPlugin(useGSAP, SplitText, ScrambleTextPlugin)

/** Act 1 copy: heading, caption, spec list. Cue-driven, time-based reveals (never scrubbed). */
export function IdeaHud() {
  const root = useRef<HTMLDivElement>(null)
  const c = content.idea

  useGSAP(
    (_context, contextSafe) => {
      const el = root.current!
      const heading = el.querySelector('h2')!
      const caption = el.querySelector('[data-caption]')!
      const labels = Array.from(el.querySelectorAll('[data-label]'))
      const values = Array.from(el.querySelectorAll('[data-value]'))
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Which way the reveal should currently run. A re-split (font load / resize) builds a fresh paused
      // timeline and SplitText only syncs its time, so `drive` re-applies the direction afterwards.
      let want: 'idle' | 'fwd' | 'rev' = 'idle'
      let reveal = gsap.timeline({ paused: true })

      const drive = () => {
        if (want === 'fwd' && reveal.progress() < 1) reveal.timeScale(1).play()
        else if (want === 'rev' && reveal.progress() > 0) reveal.timeScale(2).reverse()
      }

      const split = SplitText.create(heading, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit(self) {
          reveal = gsap.timeline({ paused: true })
          if (reduce) {
            reveal.from([heading, caption, ...labels, ...values], { autoAlpha: 0, duration: 0.2 })
          } else {
            reveal
              .from(self.lines, { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0)
              .from(caption, { autoAlpha: 0, y: 12, duration: 0.6, ease: 'power2.out' }, 0.25)
              .from(labels, { autoAlpha: 0, duration: 0.3, stagger: 0.06 }, 0.4)
              .from(values, { autoAlpha: 0, duration: 0.01, stagger: 0.07 }, 0.4)
              .to(
                values,
                { scrambleText: { text: '{original}', chars: '0123456789.<>', speed: 0.5 }, duration: 0.9, stagger: 0.07 },
                0.4,
              )
          }
          // Runs after SplitText has synced the returned timeline's time.
          queueMicrotask(drive)
          return reveal
        },
      })

      const fadeOut = contextSafe!(() => {
        gsap.to(el, { autoAlpha: 0, y: reduce ? 0 : -16, duration: reduce ? 0.2 : 0.4, ease: 'power2.in', overwrite: 'auto' })
      })
      const fadeBack = contextSafe!(() => {
        gsap.to(el, { autoAlpha: 1, y: 0, duration: reduce ? 0.2 : 0.5, ease: 'power2.out', overwrite: 'auto' })
      })

      const offIn = addCue({
        at: IDEA_BEATS.copyIn,
        enter: () => {
          want = 'fwd'
          drive()
        },
        leaveBack: () => {
          want = 'rev'
          drive()
        },
      })
      const offOut = addCue({ at: IDEA_BEATS.copyOut, enter: fadeOut, leaveBack: fadeBack })

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
      aria-label={content.actNames.idea}
      className="pointer-events-none absolute inset-y-0 left-[7vw] flex w-[min(32vw,480px)] items-center"
    >
      <div ref={root}>
        <h2 className="text-[clamp(40px,4vw,68px)] font-semibold leading-[0.98] tracking-[-0.01em] text-line" style={{ fontStretch: '125%' }}>
          {c.heading}
        </h2>
        <p data-caption className="mt-6 max-w-[38ch] text-[17px] leading-relaxed text-line/80">
          {c.caption}
        </p>
        <dl className="mt-10 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 font-mono text-[12px] uppercase tracking-[0.12em]">
          {c.specs.map((s) => (
            <Fragment key={s.label}>
              <dt data-label className="text-mute">
                {s.label}
              </dt>
              <dd data-value className="m-0 text-line">
                {s.value}
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </section>
  )
}
