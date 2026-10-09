import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../../config/acts'
import { CAM } from '../../config/mold'
import { registerIdea } from '../idea/timeline'
import { IDEA_INITIAL, idea } from '../idea/state'
import { registerPrint } from '../print/timeline'
import { PRINT_INITIAL, print } from '../print/state'
import { content } from '../../content'
import { MOLD_BEATS as B } from './beats'
import { registerMold } from './timeline'
import { MOLD_INITIAL, mold } from './state'
import { CAM_INITIAL, FLASK_INITIAL, RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'

/** Plain copy without GSAP's `_gsap` cache (it is also added to the `clones` array). */
const snap = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([k]) => k !== '_gsap').map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])) as T

let tl: gsap.core.Timeline
let offs: (() => void)[] = []

beforeEach(() => {
  Object.assign(idea, IDEA_INITIAL)
  Object.assign(print, PRINT_INITIAL)
  Object.assign(mold, MOLD_INITIAL, { clones: [...MOLD_INITIAL.clones] })
  Object.assign(story.ring, RING_INITIAL)
  Object.assign(story.flask, FLASK_INITIAL)
  Object.assign(story.stream, STREAM_INITIAL)
  Object.assign(story.cam, CAM_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, TOTAL_SCREENS)
  offs = [registerIdea(tl), registerPrint(tl), registerMold(tl)]
})

afterEach(() => {
  offs.forEach((off) => off())
  tl.kill()
})

describe('act 3 timeline', () => {
  it('moves nothing of act 3 before 4.0', () => {
    tl.time(3.99)
    expect(story.cam).toMatchObject(CAM_INITIAL)
    expect(story.ring.tree).toBe(0)
    expect(snap(mold)).toEqual(MOLD_INITIAL)
  })

  it('pulls the camera back and raises the base, then lands the hero ring on the trunk', () => {
    tl.time(4.4)
    expect(snap(story.cam)).toEqual(CAM.tree)
    expect(mold.base).toBe(1)
    tl.time(4.6)
    expect(story.ring.tree).toBe(1)
    expect(mold.trunk).toBe(1)
  })

  it('pops the clones in one after another, then lowers the flask', () => {
    tl.time(4.7)
    expect(mold.clones[0]).toBeGreaterThan(0)
    expect(mold.clones[2]).toBe(0)
    tl.time(4.95)
    expect([...mold.clones]).toEqual([1, 1, 1])
    expect(mold.flask).toBe(0)
    tl.time(5.25)
    expect(mold.flask).toBe(1)
  })

  it('wraps the tape, then fills the flask with investment', () => {
    tl.time(5.65)
    expect(mold.tape).toBe(1)
    expect(mold.fill).toBe(0)
    tl.time(6.0)
    expect(mold.fill).toBe(1)
  })

  it('raises the camera for the pour (before the investment) and keeps it there', () => {
    tl.time(5.5)
    expect(snap(story.cam)).toEqual(CAM.tree)
    tl.time(5.8)
    expect(snap(story.cam)).toEqual(CAM.pour)
    tl.time(6.2)
    expect(snap(story.cam)).toEqual(CAM.pour)
  })

  it('shows the vacuum gauge for the boil and takes it away when the needle is back at zero', () => {
    expect(B.gaugeIn).toBe(B.boilFrom)
    expect(B.gaugeOut).toBeGreaterThanOrEqual(B.boilTo)
    expect(B.gaugeOut).toBeLessThanOrEqual(B.restFrom)
  })

  it('says the flask goes into a vacuum chamber that pulls the air out of the investment, then the investment thickens for 10 to 15 minutes before the tape comes off', () => {
    const c = content.mold.caption
    expect(c).toContain('vacuum chamber')
    expect(c).toContain('air out of the investment')
    expect(c).toContain('before the furnace')
    expect(c).toContain('10 to 15 minutes')
    expect(c).toContain('tape')
    expect(c).not.toContain('—')
  })

  it('boils under vacuum only between its start and end, and the needle (boil) is back at zero after', () => {
    tl.time(B.boilFrom)
    expect(mold.boil).toBe(0)
    tl.time((B.boilFrom + B.boilTo) / 2)
    expect(mold.boil).toBe(1)
    tl.time(B.boilTo)
    expect(mold.boil).toBe(0)
  })

  it('then the investment rests: the timer runs while the tape stays on, and the tape comes off only after it', () => {
    expect(B.restFrom).toBeGreaterThanOrEqual(B.gaugeOut)
    expect(B.restFrom).toBe(B.steps.rest)
    expect(B.unwrapFrom).toBeGreaterThanOrEqual(B.restTo)
    expect(B.unwrapFrom).toBe(B.steps.tapeOff)
    expect(B.restTo - B.restFrom).toBeGreaterThan(0.1)
    expect(B.restTo).toBeLessThanOrEqual(B.copyOut)
    tl.time(B.restFrom)
    expect(mold.rest).toBe(0)
    tl.time((B.restFrom + B.restTo) / 2)
    expect(mold.rest).toBeGreaterThan(0)
    expect(mold.rest).toBeLessThan(1)
    expect(mold.tape).toBe(1)
    tl.time(B.restTo)
    expect(mold.rest).toBe(1)
    expect(mold.tape).toBe(1)
  })

  it('unwinds the tape, drops the base (the camera stays raised), then holds', () => {
    tl.time(B.unwrapTo)
    expect(mold.tape).toBe(0)
    tl.time(B.baseOutTo)
    expect(mold.base).toBe(0)
    expect(snap(story.cam)).toEqual(CAM.pour)
    const held = { mold: snap(mold), ring: snap(story.ring), cam: snap(story.cam) }
    tl.time(4.0)
    const yaw = story.ring.yaw
    tl.time(9)
    expect(story.ring.yaw).toBe(yaw)
    expect({ mold: snap(mold), ring: snap(story.ring), cam: snap(story.cam) }).toEqual(held)
  })

  it('restores acts 1-2 exactly when scrubbed back from act 3', () => {
    tl.time(3.99)
    const ring = snap(story.ring)
    tl.time(9)
    tl.time(3.99)
    expect(story.ring).toMatchObject(ring)
    expect(snap(mold)).toEqual(MOLD_INITIAL)
    expect(story.cam).toMatchObject(CAM_INITIAL)
    expect(story.ring.tree).toBe(0)
    tl.time(0)
    expect(story.ring).toMatchObject(RING_INITIAL)
    expect(story.cam).toMatchObject(CAM_INITIAL)
    expect(snap(mold)).toEqual(MOLD_INITIAL)
  })
})
