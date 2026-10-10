import { gsap } from 'gsap'
import { CAM } from '../../config/mold'
import { ASSEMBLY } from '../../config/assembly'
import { story } from '../../story/store'
import { LIFT_CAM } from '../../config/print'
import { MOLD_BEATS as B } from './beats'
import { mold } from './state'

/**
 * Adds Act 3's scrubbed tweens to `tl` at absolute screens. fromTo + immediateRender:false everywhere, so both
 * scroll directions restore exact values. Act 3 owns `story.ring.flight`, `story.cam` and `mold.*`.
 */
export function registerMold(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  const len = (from: number, to: number) => to - from

  // Camera pulls back from where Act 2 left it to the tree view, while the rings fly.
  seg.fromTo(story.cam, { ...LIFT_CAM }, { ...CAM.tree, duration: len(B.camFrom, B.camTo), ease: 'power2.inOut' }, B.camFrom)

  // The base rises into the centre with the trunk standing on it (one motion: same span, same ease).
  seg.fromTo(mold, { base: 0 }, { base: 1, duration: len(B.baseInFrom, B.baseInTo), ease: 'power2.out' }, B.baseInFrom)
  seg.fromTo(mold, { trunk: 0 }, { trunk: 1, duration: len(B.baseInFrom, B.baseInTo), ease: 'power2.out' }, B.baseInFrom)

  // Then the four printed rings fly straight onto their slots one after another (curve to a staging point outside the slot,
  // then a slide along the sprue axis; each grows to full size on the way: src/scene/ring/placement.ts).
  ASSEMBLY.order.forEach((k, i) => {
    seg.fromTo(story.ring.flight, { [k]: 0 }, { [k]: 1, duration: B.flightLen, ease: 'power2.inOut' }, B.flightFrom + i * B.flightStagger)
  })

  // Flask, tape, investment.
  seg.fromTo(mold, { flask: 0 }, { flask: 1, duration: len(B.flaskFrom, B.flaskTo), ease: 'power2.in' }, B.flaskFrom)
  seg.fromTo(mold, { tape: 0 }, { tape: 1, duration: len(B.tapeFrom, B.tapeTo) }, B.tapeFrom)
  seg.fromTo(mold, { fill: 0 }, { fill: 1, duration: len(B.fillFrom, B.fillTo) }, B.fillFrom)

  // The camera rises and tilts down into the flask for the pour, and stays there for the boil and the rest of the act.
  seg.fromTo(story.cam, { ...CAM.tree }, { ...CAM.pour, duration: len(B.camRaiseFrom, B.camRaiseTo), ease: 'power2.inOut' }, B.camRaiseFrom)

  // Vacuum: the surface boils (ramps up, holds, ramps down to zero before the rest).
  const ramp = 0.05
  seg.fromTo(mold, { boil: 0 }, { boil: 1, duration: ramp }, B.boilFrom)
  seg.fromTo(mold, { boil: 1 }, { boil: 0, duration: ramp }, B.boilTo - ramp)

  // The investment rests with the tape on (timer), then the tape comes off and the base drops out of the frame.
  seg.fromTo(mold, { rest: 0 }, { rest: 1, duration: len(B.restFrom, B.restTo) }, B.restFrom)
  seg.fromTo(mold, { tape: 1 }, { tape: 0, duration: len(B.unwrapFrom, B.unwrapTo) }, B.unwrapFrom)
  seg.fromTo(mold, { base: 1 }, { base: 0, duration: len(B.baseOutFrom, B.baseOutTo), ease: 'power2.in' }, B.baseOutFrom)

  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}
