import { gsap } from 'gsap'
import { CURE_OFF, LIFT_CAM, PRINT, printPose } from '../../config/print'
import { CAM_INITIAL, story } from '../../story/store'
import { PRINT_BEATS as B } from './beats'
import { print } from './state'

const TURN = Math.PI * 2
/** Extra yaw for a 3/4 view while the ring settles. */
const SETTLE_YAW = 0.6

/**
 * Adds Act 2's scrubbed tweens to `tl` at absolute screens (Act 2 owns `story.cam` from 3.72 to 3.97: LIFT_CAM). fromTo + immediateRender:false everywhere, so both
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

  // Ring switch while hidden under the cure plane: the one CAD ring becomes four resin rings in a 2 x 2 grid on the plate.
  seg.fromTo(
    story.ring,
    { fill: 0, cad: 1, resin: 0, sprue: 0, flip: 0, y: 0, cureY: CURE_OFF, scale: 1, spread: 0 },
    { fill: 1, cad: 0, resin: 1, sprue: 1, flip: Math.PI, y: start.ringY, cureY: PRINT.cureY, scale: PRINT.scale, spread: 1, duration: instant },
    B.setup,
  )
  seg.fromTo(print, { sup: 0 }, { sup: start.ringY, duration: instant }, B.setup)

  seg.fromTo(print, { plate: PRINT.plate.parkedY }, { plate: start.plateY, duration: len(B.plateDownFrom, B.plateDownTo), ease: 'power2.inOut' }, B.plateDownFrom)

  // Printing: plate and part rise together, linearly, so they stay attached.
  const printing = len(B.printFrom, B.printTo)
  seg.fromTo(print, { grow: 0 }, { grow: 1, duration: printing }, B.printFrom)
  // The resin stream feeds the cure front at the same pace; every point has arrived by printTo.
  seg.fromTo(story.stream, { feed: 0 }, { feed: 1, duration: printing }, B.printFrom)
  seg.fromTo(story.stream, { opacity: 1 }, { opacity: 0, duration: instant }, B.printTo)
  seg.fromTo(print, { plate: start.plateY }, { plate: end.plateY, duration: printing }, B.printFrom)
  seg.fromTo(story.ring, { y: start.ringY }, { y: end.ringY, duration: printing }, B.printFrom)
  // The supports are printed with the ring and rise with it.
  seg.fromTo(print, { sup: start.ringY }, { sup: end.ringY, duration: printing }, B.printFrom)
  // The bed light dims as the resin is used up: gone when the print is done (no green glow under the finished part).
  seg.fromTo(print, { bed: 1 }, { bed: 0, duration: printing, ease: 'power1.in' }, B.printFrom)
  seg.fromTo(print, { glow: 0 }, { glow: 1, duration: 0.03 }, B.printFrom)
  seg.fromTo(print, { glow: 1 }, { glow: 0, duration: 0.03 }, B.printTo - 0.03)

  // Done: at 100% the supports crumble into a short puff while the ring still hangs on its sprue (the sprue stays).
  seg.fromTo(print, { drop: 0 }, { drop: 1, duration: len(B.crumbleFrom, B.crumbleTo) }, B.crumbleFrom)
  // Then clip off, plate away (up out of the frame), the rings turn upright and grow to full size while the camera
  // pulls back; the front two move out and the back two a little, so all four show side by side at the end of the act.
  seg.fromTo(story.ring, { cureY: PRINT.cureY }, { cureY: CURE_OFF, duration: instant }, B.printTo)
  seg.fromTo(print, { plate: end.plateY }, { plate: PRINT.plate.liftY, duration: len(B.liftFrom, B.liftTo), ease: 'power1.in' }, B.liftFrom)
  seg.fromTo(story.ring, { spread: 1 }, { spread: PRINT.grid.liftSpread, duration: len(B.spreadFrom, B.spreadTo), ease: 'power2.inOut' }, B.spreadFrom)
  seg.fromTo(story.ring, { scale: PRINT.scale }, { scale: 1, duration: len(B.growFrom, B.growTo), ease: 'power1.inOut' }, B.growFrom)
  seg.fromTo(story.cam, { ...CAM_INITIAL }, { ...LIFT_CAM, duration: len(B.camFrom, B.camTo), ease: 'power2.inOut' }, B.camFrom)
  const flip = len(B.flipFrom, B.flipTo)
  seg.fromTo(story.ring, { flip: Math.PI }, { flip: TURN, duration: flip, ease: 'power2.inOut' }, B.flipFrom)
  seg.fromTo(story.ring, { y: end.ringY }, { y: 0, duration: flip, ease: 'power2.inOut' }, B.flipFrom)
  seg.fromTo(story.ring, { yaw: TURN }, { yaw: TURN + SETTLE_YAW, duration: flip, ease: 'sine.inOut' }, B.flipFrom)

  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}
