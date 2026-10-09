import { gsap } from 'gsap'
import { CAM_BIRTH, CAM_BIRTH_START, CUT_ORDER, FINAL, POLISH_TURN } from '../../config/birth'
import { story } from '../../story/store'
import { BIRTH_BEATS as B } from './beats'
import { birth } from './state'

/**
 * Adds Act 7's scrubbed tweens to `tl` at absolute screens. fromTo + immediateRender:false everywhere, so both scroll
 * directions restore exact values. Act 6 leaves the tree standing in front and the camera at CAM_WATER.raw; Act 7
 * owns `birth.*` and `story.cam` from 14.0.
 */
export function registerBirth(tl: gsap.core.Timeline): () => void {
  const seg = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
  const len = (from: number, to: number) => to - from

  // The jar rises in under the tree while the camera frames both.
  seg.fromTo(story.cam, { ...CAM_BIRTH_START }, { ...CAM_BIRTH.jar, duration: len(B.camFrom, B.camTo), ease: 'power2.inOut' }, B.camFrom)
  seg.fromTo(birth, { jar: 0 }, { jar: 1, duration: len(B.jarFrom, B.jarTo), ease: 'power2.out' }, B.jarFrom)

  // The rings come off one by one (linear: the pose function adds the gravity curve and the spin).
  CUT_ORDER.forEach((slot, k) => {
    const key = `cut${slot}`
    seg.fromTo(birth, { [key]: 0 }, { [key]: 1, duration: B.fallLen }, B.cutFrom + k * B.cutStep)
  })

  // The empty tree goes up; ten minutes in the acid.
  seg.fromTo(birth, { treeUp: 0 }, { treeUp: 1, duration: len(B.treeUpFrom, B.treeUpTo), ease: 'power2.in' }, B.treeUpFrom)
  seg.fromTo(birth, { rest: 0 }, { rest: 1, duration: len(B.restFrom, B.restTo) }, B.restFrom)

  // The top ring comes out to the centre, the jar goes down, the camera closes in.
  seg.fromTo(birth, { out: 0 }, { out: 1, duration: len(B.outFrom, B.outTo), ease: 'power2.inOut' }, B.outFrom)
  seg.fromTo(birth, { jarAway: 0 }, { jarAway: 1, duration: len(B.outFrom, B.outTo), ease: 'power2.in' }, B.outFrom)
  seg.fromTo(story.cam, { ...CAM_BIRTH.jar }, { ...CAM_BIRTH.polish, duration: len(B.outFrom, B.outTo), ease: 'power2.inOut' }, B.outFrom)

  // The neon line passes right to left while the ring turns right; then the whole ring is polished.
  seg.fromTo(birth, { line: 0 }, { line: 1, duration: len(B.polishFrom, B.polishTo), ease: 'power1.inOut' }, B.polishFrom)
  seg.fromTo(birth, { turn: 0 }, { turn: POLISH_TURN, duration: len(B.polishFrom, B.polishTo) }, B.polishFrom)
  seg.fromTo(birth, { all: 0 }, { all: 1, duration: 0.01 }, B.polishTo)

  // Final: tilt, reflection and spin, the final camera.
  seg.fromTo(birth, { tilt: 0 }, { tilt: FINAL.tilt, duration: len(B.finalFrom, B.finalTo), ease: 'power2.inOut' }, B.finalFrom)
  seg.fromTo(birth, { finale: 0 }, { finale: 1, duration: len(B.finalFrom, B.finalTo), ease: 'power1.inOut' }, B.finalFrom)
  seg.fromTo(story.cam, { ...CAM_BIRTH.polish }, { ...CAM_BIRTH.final, duration: len(B.finalFrom, B.finalTo), ease: 'power2.inOut' }, B.finalFrom)

  tl.add(seg, 0)
  return () => {
    seg.kill()
  }
}
