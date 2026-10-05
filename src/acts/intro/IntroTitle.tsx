import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { content } from '../../content'
import { useAppState } from '../../story/appState'
import { addCue } from '../../story/cues'
import { story } from '../../story/store'

gsap.registerPlugin(useGSAP, ScrambleTextPlugin)

/** Screen where the title leaves when scrolling down and returns when scrolling back up. */
export const INTRO_OUT = 0.25
/** Longer than any glyph outline at the title size, so one dash covers each contour. */
const DASH = 1400
const LINE_HEIGHT = 120
/** Matches the loader's fade-out (src/hud/Loader.tsx). */
const LOADER_FADE = 0.7

/** Act 0: the title draws in as an outline, then fills (StrokeText technique, SVG + GSAP). */
export function IntroTitle() {
  const root = useRef<HTMLDivElement>(null)
  const { phase } = useAppState()

  // Initial state + fit the SVG to the real glyph bounds once the display font is loaded.
  useGSAP(
    () => {
      const el = root.current!
      const svg = el.querySelector('svg')!
      gsap.set(el, { autoAlpha: 0 })
      gsap.set(el.querySelectorAll('text'), { strokeDasharray: DASH, strokeDashoffset: DASH, fillOpacity: 0 })
      let alive = true
      const fit = () => {
        if (!alive) return
        const b = svg.getBBox()
        svg.setAttribute('viewBox', `${b.x - 4} ${b.y - 4} ${b.width + 8} ${b.height + 8}`)
      }
      // Explicit load so a font that has not been requested yet cannot make `ready` resolve too early.
      document.fonts
        .load('600 112px Archivo')
        .then(() => document.fonts.ready)
        .then(fit, fit)
      return () => {
        alive = false
      }
    },
    { scope: root },
  )

  // `revertOnUpdate`: without it @gsap/react defers cleanup to unmount, so a phase change (ready -> error)
  // would re-run this effect and register a second cue without disposing the first.
  useGSAP(
    () => {
      if (phase !== 'ready') return
      const el = root.current!
      const texts = el.querySelectorAll('text')
      const sub = el.querySelector<HTMLElement>('[data-sub]')!
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const intro = gsap.timeline({ paused: true })
      if (reduce) {
        intro.set(texts, { strokeDashoffset: 0, fillOpacity: 1 }).to(el, { autoAlpha: 1, duration: 0.3 })
      } else {
        // Starts as the loader finishes fading, so the outline draw is not hidden under it.
        const t = LOADER_FADE
        intro
          .set(el, { autoAlpha: 1 }, t)
          .to(texts, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.18 }, t + 0.1)
          .to(texts, { fillOpacity: 1, duration: 0.8, ease: 'power1.out', stagger: 0.18 }, t + 1.15)
          .fromTo(sub, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t + 1.45)
          .to(sub, { scrambleText: { text: content.intro.subtitle, chars: 'upperCase', speed: 0.6 }, duration: 1 }, t + 1.45)
      }

      const off = addCue({
        at: INTRO_OUT,
        enter: () => {
          // Landing already past the title (reload mid-page): finish silently, no flash of a title fading out.
          const untouched = intro.progress() === 0
          intro.progress(1)
          if (untouched) {
            gsap.set(el, { autoAlpha: 0, y: reduce ? 0 : -24 })
            return
          }
          gsap.to(el, { autoAlpha: 0, y: reduce ? 0 : -24, duration: reduce ? 0.2 : 0.5, ease: 'power2.in', overwrite: 'auto' })
        },
        leaveBack: () => {
          gsap.to(el, { autoAlpha: 1, y: 0, duration: reduce ? 0.2 : 0.6, ease: 'power2.out', overwrite: 'auto' })
        },
      })
      if (story.screen < INTRO_OUT) intro.play()
      return () => {
        off()
        gsap.killTweensOf(el)
      }
    },
    { dependencies: [phase], scope: root, revertOnUpdate: true },
  )

  // The outer box centers the block with flex (no CSS translate); the inner root is the only element GSAP moves (y).
  return (
    <div className="pointer-events-none absolute inset-y-0 left-[7vw] flex w-[min(54vw,960px)] items-center">
      <div ref={root} aria-hidden="true" className="invisible w-full">
        <svg className="block w-full overflow-visible text-line" viewBox={`0 0 1000 ${LINE_HEIGHT * content.intro.titleLines.length + 20}`}>
          {content.intro.titleLines.map((line, i) => (
            <text
              key={line}
              x="0"
              y={100 + i * LINE_HEIGHT}
              fill="currentColor"
              stroke="currentColor"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
              style={{ fontFamily: 'var(--font-display)', fontStretch: '125%', fontWeight: 600, fontSize: 112, letterSpacing: '-0.01em' }}
            >
              {line}
            </text>
          ))}
        </svg>
        <p data-sub className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-mute">
          {content.intro.subtitle}
        </p>
      </div>
    </div>
  )
}
