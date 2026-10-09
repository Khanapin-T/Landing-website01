import { gsap } from 'gsap'
import { CAM } from '../../config/mold'
import { story } from '../../story/store'
import { FIRE_BEATS as B } from './beats'
import { fire } from './state'

/**
 * Adds Act 4's scrubbed tweens to `tl` at absolute screens. fromTo + immediateRender:false everywhere, so both scroll
 * directions restore exact values. Act 4 owns `fire.*` and `story.flask.*` from 6.5 on (Act 5 takes `story.flask` over
 * after 9.0) and `story.cam` between 6.5 and 6.9 (down and back) and between 8.42 and 8.66 (back to the tree view).
 */
export function registerFire(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  const len = (from: number, to: number) => to - from

  // The camera comes down from the pour view to the furnace view (level, pulled back: the flask recedes into the springs).
  seg.fromTo(story.cam, { ...CAM.pour }, { ...CAM.furnace, duration: len(B.camFrom, B.camTo), ease: 'power2.inOut' }, B.camFrom)

  // Coils fade in, nearest row first, and heat up with the flask.
  B.coilFrom.forEach((from, i) => {
    seg.fromTo(fire.coils, { [i]: 0 }, { [i]: 1, duration: B.coilLen, ease: 'power2.out' }, from)
  })
  seg.fromTo(story.flask, { heat: 0 }, { heat: 1, duration: len(B.heatFrom, B.heatTo), ease: 'power1.in' }, B.heatFrom)

  // X-ray on, the tree burns away, X-ray off.
  seg.fromTo(story.flask, { xray: 0 }, { xray: 1, duration: len(B.xrayInFrom, B.xrayInTo) }, B.xrayInFrom)
  seg.fromTo(story.flask, { burn: 0 }, { burn: 1, duration: len(B.burnFrom, B.burnTo) }, B.burnFrom)
  seg.fromTo(story.flask, { xray: 1 }, { xray: 0, duration: len(B.xrayOutFrom, B.xrayOutTo) }, B.xrayOutFrom)

  // After the X-ray the flask comes back toward the camera, then turns over; the coils leave; the heat settles for Act 5.
  seg.fromTo(story.cam, { ...CAM.furnace }, { ...CAM.tree, duration: len(B.camBackFrom, B.camBackTo), ease: 'power2.inOut' }, B.camBackFrom)
  seg.fromTo(story.flask, { flip: 0 }, { flip: 1, duration: len(B.flipFrom, B.flipTo), ease: 'power2.inOut' }, B.flipFrom)
  B.coilOutFrom.forEach((from, i) => {
    seg.fromTo(fire.coils, { [i]: 1 }, { [i]: 0, duration: B.coilOutLen, ease: 'power2.in' }, from)
  })
  seg.fromTo(story.flask, { heat: 1 }, { heat: B.heatEnd, duration: len(B.coolFrom, B.coolTo), ease: 'power1.out' }, B.coolFrom)

  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}
