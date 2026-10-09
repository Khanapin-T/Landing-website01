import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../../config/acts'
import { CAM_BIRTH, CUT_ORDER, FINAL, POLISH_TURN, WIPE } from '../../config/birth'
import { CAM_WATER } from '../../config/water'
import { FIRE_INITIAL, fire } from '../fire/state'
import { registerFire } from '../fire/timeline'
import { GOLD_INITIAL, gold } from '../gold/state'
import { registerGold } from '../gold/timeline'
import { registerIdea } from '../idea/timeline'
import { IDEA_INITIAL, idea } from '../idea/state'
import { registerMold } from '../mold/timeline'
import { MOLD_INITIAL, mold } from '../mold/state'
import { registerPrint } from '../print/timeline'
import { PRINT_INITIAL, print } from '../print/state'
import { WATER_BEATS } from '../water/beats'
import { WATER_INITIAL, water } from '../water/state'
import { registerWater } from '../water/timeline'
import { CAM_INITIAL, FLASK_INITIAL, RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'
import { BIRTH_BEATS as B } from './beats'
import { BIRTH_INITIAL, birth, cutOf } from './state'
import { registerBirth } from './timeline'

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
  Object.assign(water, WATER_INITIAL)
  Object.assign(birth, BIRTH_INITIAL)
  Object.assign(story.ring, RING_INITIAL)
  Object.assign(story.stream, STREAM_INITIAL)
  Object.assign(story.flask, FLASK_INITIAL)
  Object.assign(story.cam, CAM_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, TOTAL_SCREENS)
  offs = [registerIdea(tl), registerPrint(tl), registerMold(tl), registerFire(tl), registerGold(tl), registerWater(tl), registerBirth(tl)]
})

afterEach(() => {
  offs.forEach((off) => off())
  tl.kill()
})

const state = () => ({ birth: snap(birth), water: snap(water), flask: snap(story.flask), cam: snap(story.cam) })
const fallFrom = (k: number) => B.cutFrom + k * B.cutStep

describe('act 7 timeline', () => {
  it('starts after act 6 is done and takes the copy column after act 6 gives it up', () => {
    expect(B.camFrom).toBeGreaterThanOrEqual(WATER_BEATS.camRawTo)
    expect(B.camFrom).toBeGreaterThanOrEqual(WATER_BEATS.yawTo)
    expect(B.copyIn).toBeGreaterThan(WATER_BEATS.copyOut)
    expect(B.windowFrom).toBe(WATER_BEATS.windowTo)
  })

  it('moves nothing of act 7 before it starts', () => {
    tl.time(B.camFrom - 0.01)
    expect(snap(birth)).toEqual(BIRTH_INITIAL)
    expect(snap(story.cam)).toEqual({ ...CAM_WATER.raw })
  })

  it('has the jar in place and the jar view before the first cut', () => {
    tl.time(B.cutFrom)
    expect(birth.jar).toBe(1)
    expect(snap(story.cam)).toEqual({ ...CAM_BIRTH.jar })
    for (const s of [0, 1, 2, 3]) expect(cutOf(birth, s)).toBe(0)
  })

  it('cuts the rings one by one in CUT_ORDER, each at rest before the next falls', () => {
    CUT_ORDER.forEach((slot, k) => {
      tl.time(fallFrom(k) - 0.001)
      expect(cutOf(birth, slot)).toBe(0)
      tl.time(fallFrom(k) + B.fallLen)
      expect(cutOf(birth, slot)).toBe(1)
      if (k + 1 < CUT_ORDER.length) expect(fallFrom(k) + B.fallLen).toBeLessThanOrEqual(fallFrom(k + 1))
    })
    expect(fallFrom(CUT_ORDER.length - 1) + B.fallLen).toBeLessThanOrEqual(B.treeUpFrom)
  })

  it('lifts the empty tree away, then runs the acid timer', () => {
    tl.time(B.treeUpTo)
    expect(birth.treeUp).toBe(1)
    expect(birth.rest).toBe(0)
    tl.time(B.restTo)
    expect(birth.rest).toBe(1)
    expect(birth.out).toBe(0)
  })

  it('brings the top ring to the centre as the jar goes, then polishes it', () => {
    tl.time(B.outTo)
    expect(birth.out).toBe(1)
    expect(birth.jarAway).toBe(1)
    expect(snap(story.cam)).toEqual({ ...CAM_BIRTH.polish })
    expect(birth.line).toBe(0)
    tl.time(B.polishTo)
    expect(birth.line).toBe(1)
    expect(birth.turn).toBeCloseTo(POLISH_TURN, 5)
    tl.time(B.polishTo + 0.02)
    expect(birth.all).toBe(1)
  })

  it('takes the line on to the left edge after the pass, then sweeps it across the page', () => {
    expect(B.edgeFrom).toBeGreaterThanOrEqual(B.polishTo)
    expect(B.sweepFrom).toBeGreaterThanOrEqual(B.edgeTo)
    expect(B.sweepTo).toBeLessThanOrEqual(TOTAL_SCREENS)
    tl.time(B.edgeFrom)
    expect(birth.edge).toBe(0)
    expect(birth.wipeX).toBe(WIPE.leftX)
    tl.time(B.edgeTo)
    expect(birth.edge).toBe(1)
    expect(birth.all).toBe(1)
    expect(birth.wipeX).toBe(WIPE.leftX)
    tl.time(B.sweepTo)
    expect(birth.wipeX).toBe(WIPE.rightX)
  })

  it('keeps the ring fully polished from before the line moves on until the end', () => {
    expect(B.polishTo + 0.01).toBeLessThanOrEqual(B.sweepFrom)
    for (const t of [B.edgeFrom + 0.02, B.edgeTo, B.sweepFrom + 0.1, B.sweepTo, TOTAL_SCREENS]) {
      tl.time(t)
      expect(birth.all).toBe(1)
      expect(birth.line).toBe(1)
    }
  })

  it('hides the act copy when the sweep starts and finishes the final frame with the sweep', () => {
    expect(B.copyOut).toBe(B.sweepFrom)
    expect(B.finalFrom).toBeGreaterThanOrEqual(B.polishTo)
    expect(B.finalTo).toBeLessThanOrEqual(B.sweepTo)
    tl.time(B.sweepTo)
    expect(birth.finale).toBe(1)
    expect(snap(story.cam)).toEqual({ ...CAM_BIRTH.final })
  })

  it('leaves the final state at the end and holds it', () => {
    tl.time(TOTAL_SCREENS)
    expect(birth).toMatchObject({ jar: 1, cut0: 1, cut1: 1, cut2: 1, cut3: 1, treeUp: 1, rest: 1, out: 1, jarAway: 1, line: 1, all: 1, finale: 1, edge: 1, wipeX: WIPE.rightX })
    expect(birth.tilt).toBeCloseTo(FINAL.tilt, 5)
    expect(snap(story.cam)).toEqual({ ...CAM_BIRTH.final })
    const held = state()
    tl.time(TOTAL_SCREENS - 0.01)
    tl.time(TOTAL_SCREENS)
    expect(state()).toEqual(held)
  })

  it('restores the end of act 6 exactly when scrubbed back', () => {
    tl.time(B.camFrom - 0.01)
    const before = state()
    tl.time(16.7)
    tl.time(B.camFrom - 0.01)
    expect(state()).toEqual(before)
  })

  it('is a pure function of the scroll position (a jump equals a scrub)', () => {
    tl.time(15.4)
    const jumped = state()
    tl.time(13.0)
    tl.time(14.5)
    tl.time(15.4)
    expect(state()).toEqual(jumped)
    for (const at of [16.2, B.edgeFrom + 0.1, B.sweepFrom + 0.15]) {
      tl.time(0)
      tl.time(at)
      const far = state()
      tl.time(TOTAL_SCREENS)
      tl.time(at)
      expect(state()).toEqual(far)
    }
  })
})
