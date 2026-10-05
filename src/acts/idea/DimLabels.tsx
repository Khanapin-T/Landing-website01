import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { content } from '../../content'
import { addCue } from '../../story/cues'
import { IDEA_BEATS } from './beats'

gsap.registerPlugin(useGSAP, ScrambleTextPlugin)

/**
 * Screen-space slots for the dimension labels. IdeaScene projects the 3D anchors every frame and writes
 * the transforms here directly (no React state, no extra React roots like drei <Html>).
 */
export const dimLabelEls: { height: HTMLElement | null; width: HTMLElement | null } = { height: null, width: null }

const LABEL = 'absolute left-0 top-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-line'

/** "24.8 mm" / "23.5 mm" next to the dimension lines. Cue-driven: decode in, fade out. */
export function DimLabels() {
  const height = useRef<HTMLSpanElement>(null)
  const width = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    dimLabelEls.height = height.current
    dimLabelEls.width = width.current
    const items = [
      { el: height.current!, text: content.idea.dims.height },
      { el: width.current!, text: content.idea.dims.width },
    ]
    const els = items.map((i) => i.el)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.set(els, { autoAlpha: 0 })
    const show = () => {
      gsap.set(els, { autoAlpha: 1 })
      if (reduce) return
      items.forEach(({ el, text }, i) =>
        gsap.to(el, { scrambleText: { text, chars: '0123456789.', speed: 0.5 }, duration: 0.7, delay: i * 0.08, overwrite: 'auto' }),
      )
    }
    const hide = () => gsap.to(els, { autoAlpha: 0, duration: reduce ? 0.1 : 0.3, overwrite: 'auto' })
    const offIn = addCue({ at: IDEA_BEATS.dimLabelsIn, enter: show, leaveBack: hide })
    const offOut = addCue({ at: IDEA_BEATS.dimLabelsOut, enter: hide, leaveBack: show })
    return () => {
      offIn()
      offOut()
      dimLabelEls.height = null
      dimLabelEls.width = null
    }
  })

  return (
    <div aria-hidden="true">
      <span ref={height} className={LABEL}>
        {content.idea.dims.height}
      </span>
      <span ref={width} className={LABEL}>
        {content.idea.dims.width}
      </span>
    </div>
  )
}
