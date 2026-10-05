import { gsap } from 'gsap'
import { CURE_OFF, PRINT, printPose } from '../../config/print'
import { story } from '../../story/store'
import { PRINT_BEATS as B } from './beats'
import { print } from './state'

const TURN = Math.PI * 2
/** Extra yaw for a 3/4 view while the ring settles. */
const SETTLE_YAW = 0.6

/**
 * Adds Act 2's scrubbed tweens to `tl` at absolute screens. fromTo + immediateRender:false everywhere, so both
 * scroll directions restore exact values.
 */
export function registerPrint(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  const len = (from: number, to: number) => to - from
  const start = printPose(0)
  const end = printPose(1)
  // Zero duration: a short blend would show a half-flipped, half-dithered ring before the clip engages.
  const instant = 0

  seg.fromTo(print, { bed: 0 }, { bed: 1, duration: len(B.bedInFrom, B.bedInTo), ease: 'power2.out' }, B.bedInFrom)

  // Ring switch while hidden under the cure plane.
  seg.fromTo(
    story.ring,
    { fill: 0, cad: 1, resin: 0, sprue: 0, flip: 0, y: 0, cureY: CURE_OFF },
    { fill: 1, cad: 0, resin: 1, sprue: 1, flip: Math.PI, y: start.ringY, cureY: PRINT.cureY, duration: instant },
    B.setup,
  )

  seg.fromTo(print, { plate: PRINT.plate.parkedY }, { plate: start.plateY, duration: len(B.plateDownFrom, B.plateDownTo), ease: 'power2.inOut' }, B.plateDownFrom)

  // Printing: plate and part rise together, linearly, so they stay attached.
  const printing = len(B.printFrom, B.printTo)
  seg.fromTo(print, { grow: 0 }, { grow: 1, duration: printing }, B.printFrom)
  // The resin stream feeds the cure front at the same pace; every point has arrived by printTo.
  seg.fromTo(story.stream, { feed: 0 }, { feed: 1, duration: printing }, B.printFrom)
  seg.fromTo(story.stream, { opacity: 1 }, { opacity: 0, duration: instant }, B.printTo)
  seg.fromTo(print, { plate: start.plateY }, { plate: end.plateY, duration: printing }, B.printFrom)
  seg.fromTo(story.ring, { y: start.ringY }, { y: end.ringY, duration: printing }, B.printFrom)
  seg.fromTo(print, { glow: 0 }, { glow: 1, duration: 0.03 }, B.printFrom)
  seg.fromTo(print, { glow: 1 }, { glow: 0, duration: 0.03 }, B.printTo - 0.03)

  // Done: clip off, plate away, ring flips upright to the center, bed light off.
  seg.fromTo(story.ring, { cureY: PRINT.cureY }, { cureY: CURE_OFF, duration: instant }, B.printTo)
  seg.fromTo(print, { plate: end.plateY }, { plate: PRINT.plate.parkedY, duration: len(B.liftFrom, B.liftTo), ease: 'power2.in' }, B.liftFrom)
  const flip = len(B.flipFrom, B.flipTo)
  seg.fromTo(story.ring, { flip: Math.PI }, { flip: TURN, duration: flip, ease: 'power2.inOut' }, B.flipFrom)
  seg.fromTo(story.ring, { y: end.ringY }, { y: 0, duration: flip, ease: 'power2.inOut' }, B.flipFrom)
  seg.fromTo(story.ring, { yaw: TURN }, { yaw: TURN + SETTLE_YAW, duration: flip, ease: 'sine.inOut' }, B.flipFrom)
  seg.fromTo(print, { bed: 1 }, { bed: 0, duration: len(B.bedOutFrom, B.bedOutTo), ease: 'power2.in' }, B.bedOutFrom)

  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}
