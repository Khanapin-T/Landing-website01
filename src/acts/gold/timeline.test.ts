import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../../config/acts'
import { FIRE_END_HEAT } from '../../config/fire'
import { FIRE_BEATS } from '../fire/beats'
import { FIRE_INITIAL, fire } from '../fire/state'
import { registerFire } from '../fire/timeline'
import { registerIdea } from '../idea/timeline'
import { IDEA_INITIAL, idea } from '../idea/state'
import { registerMold } from '../mold/timeline'
import { MOLD_INITIAL, mold } from '../mold/state'
import { registerPrint } from '../print/timeline'
import { PRINT_INITIAL, print } from '../print/state'
import { CAM_INITIAL, FLASK_INITIAL, RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'
import { GOLD_BEATS as B } from './beats'
import { GOLD_INITIAL, gold } from './state'
import { registerGold } from './timeline'

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
  Object.assign(gold, GOLD_INITIAL)
  Object.assign(story.ring, RING_INITIAL)
  Object.assign(story.stream, STREAM_INITIAL)
  Object.assign(story.flask, FLASK_INITIAL)
  Object.assign(story.cam, CAM_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, TOTAL_SCREENS)
  offs = [registerIdea(tl), registerPrint(tl), registerMold(tl), registerFire(tl), registerGold(tl)]
})

afterEach(() => {
  offs.forEach((off) => off())
  tl.kill()
})

const state = () => ({ flask: snap(story.flask), gold: snap(gold), fire: snap(fire), cam: snap(story.cam) })

describe('act 5 timeline', () => {
  it('starts only after the flask is flipped (the fill uses a fixed flip transform)', () => {
    expect(B.xrayInFrom).toBeGreaterThanOrEqual(FIRE_BEATS.flipTo)
    expect(B.vacuumFrom).toBeGreaterThanOrEqual(FIRE_BEATS.flipTo)
    expect(B.windowFrom).toBeLessThanOrEqual(B.copyIn)
  })

  it('slides the vacuum chamber on from below before the needle drops', () => {
    tl.time(B.chamberFrom - 0.01)
    expect(gold.chamber).toBe(0)
    tl.time(B.chamberTo)
    expect(gold.chamber).toBe(1)
    expect(gold.vacuum).toBe(0)
    expect(B.vacuumFrom).toBeGreaterThanOrEqual(B.chamberTo)
    expect(B.chamberFrom).toBeGreaterThanOrEqual(FIRE_BEATS.flipTo)
  })

  it('moves nothing of act 5 before the chamber comes, and takes over the heat Act 4 leaves', () => {
    tl.time(B.chamberFrom - 0.01)
    expect(snap(gold)).toEqual(GOLD_INITIAL)
    expect(story.flask.fill).toBe(0)
    expect(story.flask.cool).toBe(0)
    expect(story.flask.flip).toBe(1)
    expect(story.flask.heat).toBeCloseTo(FIRE_END_HEAT, 6)
  })

  it('shows the gauge the moment the chamber is on, before the needle drops', () => {
    expect(B.gaugeIn).toBe(B.chamberTo)
    expect(B.chamberTo).toBeLessThanOrEqual(B.vacuumFrom)
    tl.time(B.gaugeIn)
    expect(gold.chamber).toBe(1)
    expect(gold.vacuum).toBe(0)
  })

  it('drops the gauge needle to full vacuum before the X-ray', () => {
    tl.time(B.vacuumTo)
    expect(gold.vacuum).toBe(1)
    expect(B.vacuumTo).toBeLessThanOrEqual(B.xrayInFrom)
    expect(B.vacuumTo).toBeLessThanOrEqual(B.fillFrom)
  })

  it('has X-ray on only around the pour, and off only after the flash', () => {
    tl.time(B.xrayInFrom - 0.01)
    expect(story.flask.xray).toBe(0)
    tl.time(B.xrayInTo)
    expect(story.flask.xray).toBe(1)
    tl.time(B.coolTo)
    expect(story.flask.xray).toBe(1)
    tl.time(B.xrayOutTo)
    expect(story.flask.xray).toBe(0)
    expect(B.xrayOutFrom).toBeGreaterThanOrEqual(B.coolTo)
  })

  it('pours for 0.45 screens, twice as fast as before', () => {
    expect(B.fillTo - B.fillFrom).toBeCloseTo(0.45, 9)
  })

  it('fills while X-ray is on, then cools', () => {
    expect(B.fillFrom).toBeGreaterThanOrEqual(B.xrayInTo)
    tl.time((B.fillFrom + B.fillTo) / 2)
    expect(story.flask.fill).toBeGreaterThan(0)
    expect(story.flask.fill).toBeLessThan(1)
    expect(story.flask.cool).toBe(0)
    tl.time(B.fillTo)
    expect(story.flask.fill).toBe(1)
    tl.time(B.coolTo)
    expect(story.flask.cool).toBe(1)
    expect(B.coolFrom).toBeGreaterThanOrEqual(B.fillTo)
  })

  it('keeps the halved heat from the furnace through the whole pour, no extra heat change before the rest', () => {
    // Act 4 settles the heat to half (FIRE_END_HEAT) once the coils are gone; act 5 only holds it until the rest starts.
    for (const at of [B.chamberFrom, B.vacuumTo, B.xrayInFrom, B.fillTo, B.xrayOutTo, B.restFrom - 0.001]) {
      tl.time(at)
      expect(story.flask.heat).toBeCloseTo(FIRE_END_HEAT, 6)
    }
  })

  it('stays under vacuum for a short moment after the pour, then the rest starts', () => {
    expect(B.restFrom).toBeGreaterThanOrEqual(B.xrayOutTo)
    expect(B.restFrom - B.xrayOutTo).toBeLessThan(0.15)
    expect(B.restFrom).toBe(B.steps.rest)
    tl.time(B.restFrom)
    expect(gold.rest).toBe(0)
    expect(gold.chamber).toBe(1)
    expect(gold.vacuum).toBe(1)
    expect(story.flask.xray).toBe(0)
  })

  it('when the rest starts the needle falls to zero, the chamber comes off, the gauge goes and the heat fades to zero', () => {
    expect(B.unvacuumFrom).toBe(B.restFrom)
    tl.time(B.unvacuumTo)
    expect(gold.vacuum).toBe(0)
    expect(B.chamberOffFrom).toBeGreaterThanOrEqual(B.unvacuumFrom)
    expect(B.chamberOffFrom).toBeLessThan(B.unvacuumTo)
    expect(B.gaugeOut).toBeGreaterThanOrEqual(B.unvacuumTo)
    tl.time((B.chamberOffFrom + B.chamberOffTo) / 2)
    expect(gold.chamber).toBeGreaterThan(0)
    expect(gold.chamber).toBeLessThan(1)
    tl.time(B.chamberOffTo)
    expect(gold.chamber).toBe(0)
    // The heat fades gradually over the whole rest, down to zero.
    tl.time((B.restFrom + B.restTo) / 2)
    expect(story.flask.heat).toBeGreaterThan(0)
    expect(story.flask.heat).toBeLessThan(FIRE_END_HEAT)
    tl.time(B.restTo)
    expect(story.flask.heat).toBe(0)
    expect(gold.rest).toBe(1)
    expect(B.chamberOffTo).toBeLessThanOrEqual(B.restTo)
    expect(B.restTo).toBeLessThanOrEqual(B.copyOut)
  })

  it('leaves the documented end state for act 6 and holds it', () => {
    tl.time(TOTAL_SCREENS)
    // Only the flipped flask is left: no heat, no vacuum rig, the rest timer at 10:00.
    expect(story.flask).toMatchObject({ fill: 1, cool: 1, xray: 0, burn: 1, flip: 1, heat: 0 })
    expect(gold).toMatchObject({ chamber: 0, vacuum: 0, rest: 1 })
    const held = state()
    tl.time(TOTAL_SCREENS - 0.01)
    tl.time(TOTAL_SCREENS)
    expect(state()).toEqual(held)
  })

  it('restores the end of act 4 exactly when scrubbed back from the end of act 5', () => {
    tl.time(B.vacuumFrom - 0.01)
    const before = state()
    tl.time(B.restTo)
    tl.time(B.vacuumFrom - 0.01)
    expect(state()).toEqual(before)
  })

  it('is a pure function of the scroll position (a jump equals a scrub)', () => {
    tl.time(10.3)
    const jumped = state()
    tl.time(8.0)
    tl.time(9.5)
    tl.time(10.3)
    expect(state()).toEqual(jumped)
  })

  it('lands on the same state after a backward jump as after a forward scrub', () => {
    tl.time(9.0)
    tl.time(10.2)
    const forward9 = state()
    tl.time(11.4)
    tl.time(10.2)
    expect(state()).toEqual(forward9)

    tl.time(0)
    tl.time(7.5)
    const forward7 = state()
    tl.time(11.4)
    tl.time(7.5)
    expect(state()).toEqual(forward7)
  })
})
