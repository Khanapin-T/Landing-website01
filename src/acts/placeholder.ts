import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../config/acts'
import { story } from '../story/store'

const FROM = 4.0
/** Yaw at the end of Act 2 (2 PI from Act 1 plus the settle turn). */
const START_YAW = Math.PI * 2 + 0.6

/**
 * TEMP until s03: after Act 2 the resin ring (with its sprue) keeps turning slowly through acts 3-6.
 * Act 3 takes over the ring; delete this file then (and its registration in PrintScene).
 */
export function registerPlaceholder(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  const span = TOTAL_SCREENS - FROM
  seg.fromTo(story.ring, { yaw: START_YAW }, { yaw: START_YAW + span * Math.PI * 0.35, duration: span }, FROM)
  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}
