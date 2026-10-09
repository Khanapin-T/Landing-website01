import { gsap } from 'gsap'
import { CAM } from '../../config/mold'
import { CAM_WATER, RAW, SIDE_FLIP } from '../../config/water'
import { story } from '../../story/store'
import { WATER_BEATS as B } from './beats'
import { water } from './state'

/**
 * Adds Act 6's scrubbed tweens to `tl` at absolute screens. fromTo + immediateRender:false everywhere, so both scroll
 * directions restore exact values. Act 5 leaves flip = 1, heat = 0 and the camera at CAM.tree; Act 6 owns `water.*`,
 * `story.cam` from 11.5 and `story.flask.{flip, dip, wash, away}` from 11.7. Act 7 takes over after 14.0.
 */
export function registerWater(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  const len = (from: number, to: number) => to - from

  // The camera goes to the side view while the bucket rises in; the flask turns onto its side and goes under.
  seg.fromTo(story.cam, { ...CAM.tree }, { ...CAM_WATER.bucket, duration: len(B.camFrom, B.camTo), ease: 'power2.inOut' }, B.camFrom)
  seg.fromTo(water, { bucket: 0 }, { bucket: 1, duration: len(B.bucketFrom, B.bucketTo), ease: 'power2.out' }, B.bucketFrom)
  seg.fromTo(story.flask, { flip: 1 }, { flip: SIDE_FLIP, duration: len(B.turnFrom, B.turnTo), ease: 'power2.inOut' }, B.turnFrom)
  seg.fromTo(story.flask, { dip: 0 }, { dip: 1, duration: len(B.dipFrom, B.dipTo), ease: 'power2.in' }, B.dipFrom)

  // A short boil with steam the moment it is in, the water turns milky white.
  seg.fromTo(water, { boil: 0 }, { boil: 1, duration: len(B.boilFrom, B.boilTo), ease: 'power2.out' }, B.boilFrom)
  seg.fromTo(water, { boil: 1 }, { boil: 0, duration: len(B.boilOutFrom, B.boilOutTo), ease: 'power1.inOut' }, B.boilOutFrom)
  seg.fromTo(water, { steam: 0 }, { steam: 1, duration: len(B.steamFrom, B.steamTo), ease: 'power2.out' }, B.steamFrom)
  seg.fromTo(water, { steam: 1 }, { steam: 0, duration: len(B.steamOutFrom, B.steamOutTo), ease: 'power1.in' }, B.steamOutFrom)
  seg.fromTo(water, { milk: 0 }, { milk: 1, duration: len(B.milkFrom, B.milkTo), ease: 'power1.out' }, B.milkFrom)

  // Ten minutes in the calm white water; the investment is gone by the time it comes up.
  seg.fromTo(water, { rest: 0 }, { rest: 1, duration: len(B.restFrom, B.restTo) }, B.restFrom)
  seg.fromTo(story.flask, { wash: 0 }, { wash: 1, duration: 0.01 }, B.wash)

  // Up on its own, dripping; the tree slides out of the funnel end and stands up in front as the flask and bucket go.
  seg.fromTo(story.flask, { dip: 1 }, { dip: 0, duration: len(B.riseFrom, B.riseTo), ease: 'power2.inOut' }, B.riseFrom)
  seg.fromTo(water, { drip: 0 }, { drip: 1, duration: len(B.dripFrom, B.dripTo) }, B.dripFrom)
  seg.fromTo(water, { slide: 0 }, { slide: 1, duration: len(B.slideFrom, B.slideTo), ease: 'power1.inOut' }, B.slideFrom)
  // No easing here: rawTreeMatrix already applies smoothstep to `stand` (double easing made the stand-up look like a jump).
  seg.fromTo(water, { stand: 0 }, { stand: 1, duration: len(B.standFrom, B.standTo), ease: 'none' }, B.standFrom)
  seg.fromTo(story.flask, { away: 0 }, { away: 1, duration: len(B.awayFrom, B.awayTo), ease: 'power2.in' }, B.awayFrom)
  seg.fromTo(story.cam, { ...CAM_WATER.bucket }, { ...CAM_WATER.raw, duration: len(B.camRawFrom, B.camRawTo), ease: 'power2.inOut' }, B.camRawFrom)
  seg.fromTo(water, { yaw: 0 }, { yaw: RAW.yawTo, duration: len(B.yawFrom, B.yawTo), ease: 'power1.out' }, B.yawFrom)

  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}
