import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../config/acts'
import { story } from '../story/store'

const FROM = 2.5

/**
 * TEMP until s02: after Act 1 the s00 gold placeholder ring comes back for acts 2-6 and keeps turning slowly.
 * Delete this file (and its registration in IdeaScene) when Act 2 drives the ring.
 */
export function registerPlaceholder(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  seg.fromTo(story.ring, { fill: 0, cad: 1 }, { fill: 1, cad: 0, duration: 0.3 }, FROM)
  const span = TOTAL_SCREENS - FROM
  seg.fromTo(story.ring, { yaw: Math.PI * 2 }, { yaw: Math.PI * 2 + span * Math.PI * 0.35, duration: span }, FROM)
  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}
