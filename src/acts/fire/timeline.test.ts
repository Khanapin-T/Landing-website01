import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../../config/acts'
import { BURN, burnFrontY } from '../../config/fire'
import { CAM } from '../../config/mold'
import { registerIdea } from '../idea/timeline'
import { IDEA_INITIAL, idea } from '../idea/state'
import { registerMold } from '../mold/timeline'
import { MOLD_INITIAL, mold } from '../mold/state'
import { registerPrint } from '../print/timeline'
import { PRINT_INITIAL, print } from '../print/state'
import { CAM_INITIAL, FLASK_INITIAL, RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'
import { FIRE_BEATS as B } from './beats'
import { FIRE_INITIAL, fire } from './state'
import { registerFire } from './timeline'

/** Plain copy without GSAP's `_gsap` cache. */
const snap = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([k]) => k !== '_gsap').map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])) as T

let tl: gsap.core.Timeline
let offs: (() => void)[] = []

beforeEach(() => {
  Object.assign(idea, IDEA_INITIAL)
  Object.assign(print, PRINT_INITIAL)
  Object.assign(mold, MOLD_INITIAL, { clones: [...MOLD_INITIAL.clones] })
  Object.assign(fire, FIRE_INITIAL, { coils: [...FIRE_INITIAL.coils] })
  Object.assign(story.ring, RING_INITIAL)
  Object.assign(story.stream, STREAM_INITIAL)
  Object.assign(story.flask, FLASK_INITIAL)
  Object.assign(story.cam, CAM_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, TOTAL_SCREENS)
  offs = [registerIdea(tl), registerPrint(tl), registerMold(tl), registerFire(tl)]
})

afterEach(() => {
  offs.forEach((off) => off())
  tl.kill()
})

describe('act 4 timeline', () => {
  it('moves nothing of act 4 before 6.5 (act 3 ends on the raised pour view)', () => {
    tl.time(6.49)
    expect(snap(story.flask)).toEqual(FLASK_INITIAL)
    expect(snap(fire)).toEqual(FIRE_INITIAL)
    expect(snap(story.cam)).toEqual(CAM.pour)
  })

  it('brings the camera back to the level tree view', () => {
    tl.time(B.camTo)
    expect(snap(story.cam)).toEqual(CAM.tree)
  })

  it('fades the coil rows in nearest first, then heats up', () => {
    tl.time(B.coilFrom[1])
    expect(fire.coils[0]).toBeGreaterThan(0)
    expect(fire.coils[1]).toBe(0)
    tl.time(B.heatFrom)
    expect(story.flask.heat).toBe(0)
    tl.time(B.coilFrom[2] + B.coilLen)
    expect([...fire.coils]).toEqual([1, 1, 1])
    tl.time(B.heatTo)
    expect(story.flask.heat).toBe(1)
  })

  it('has X-ray on only between 7.5 and 8.55', () => {
    tl.time(B.xrayInFrom - 0.01)
    expect(story.flask.xray).toBe(0)
    tl.time(B.xrayInTo)
    expect(story.flask.xray).toBe(1)
    tl.time(B.xrayOutFrom)
    expect(story.flask.xray).toBe(1)
    tl.time(B.xrayOutTo)
    expect(story.flask.xray).toBe(0)
  })

  it('burns the tree away inside the X-ray window, top to bottom', () => {
    tl.time(B.burnFrom)
    expect(story.flask.burn).toBe(0)
    tl.time((B.burnFrom + B.burnTo) / 2)
    const y = burnFrontY(story.flask.burn)
    expect(y).toBeLessThan(BURN.topY)
    expect(y).toBeGreaterThan(BURN.bottomY)
    tl.time(B.burnTo)
    expect(story.flask.burn).toBe(1)
    expect(B.burnFrom).toBeGreaterThanOrEqual(B.xrayInTo)
    expect(B.burnTo).toBeLessThanOrEqual(B.xrayOutFrom)
  })

  it('turns the flask over, fades the coils out and leaves the heat at its end value', () => {
    tl.time(B.flipFrom)
    expect(story.flask.flip).toBe(0)
    tl.time(B.flipTo)
    expect(story.flask.flip).toBe(1)
    tl.time(B.coolTo)
    expect([...fire.coils]).toEqual([0, 0, 0])
    expect(story.flask.heat).toBeCloseTo(B.heatEnd, 6)
    const held = { flask: snap(story.flask), fire: snap(fire), cam: snap(story.cam) }
    tl.time(TOTAL_SCREENS)
    expect({ flask: snap(story.flask), fire: snap(fire), cam: snap(story.cam) }).toEqual(held)
  })

  it('restores act 3 exactly when scrubbed back from the end of act 4', () => {
    tl.time(6.49)
    const before = { flask: snap(story.flask), fire: snap(fire), cam: snap(story.cam), mold: snap(mold), ring: snap(story.ring) }
    tl.time(9)
    tl.time(6.49)
    expect({ flask: snap(story.flask), fire: snap(fire), cam: snap(story.cam), mold: snap(mold), ring: snap(story.ring) }).toEqual(before)
  })

  it('is a pure function of the scroll position (a jump equals a scrub)', () => {
    tl.time(8.0)
    const jumped = { flask: snap(story.flask), fire: snap(fire), cam: snap(story.cam) }
    tl.time(6.0)
    tl.time(7.2)
    tl.time(8.0)
    expect({ flask: snap(story.flask), fire: snap(fire), cam: snap(story.cam) }).toEqual(jumped)
  })
})
