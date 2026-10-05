import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { content } from '../../content'
import { addCue } from '../../story/cues'
import { story } from '../../story/store'
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
    // State-based, not edge-based: a jump that crosses both cues in one update (chapter click, Home key)
    // must not flash the labels. Inside a cue callback story.screen is already the landing position.
    let shown = false
    const show = () => {
      gsap.set(els, { autoAlpha: 1, overwrite: true })
      if (reduce) return
      items.forEach(({ el, text }, i) =>
        gsap.to(el, { scrambleText: { text, chars: '0123456789.', speed: 0.5 }, duration: 0.7, delay: i * 0.08 }),
      )
    }
    const hide = () => gsap.to(els, { autoAlpha: 0, duration: reduce ? 0.1 : 0.3, overwrite: true })
    const sync = () => {
      const want = story.screen >= IDEA_BEATS.dimLabelsIn && story.screen < IDEA_BEATS.dimLabelsOut
      if (want === shown) return
      shown = want
      if (want) show()
      else hide()
    }
    const offIn = addCue({ at: IDEA_BEATS.dimLabelsIn, enter: sync, leaveBack: sync })
    const offOut = addCue({ at: IDEA_BEATS.dimLabelsOut, enter: sync, leaveBack: sync })
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
