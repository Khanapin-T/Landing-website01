import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../../config/acts'
import { FLIP } from '../../config/fire'
import { CAM } from '../../config/mold'
import { CAM_WATER, FLASK_FLANGE_RADIUS, RAW, SIDE_FLIP, WATER_Y, flaskOffset } from '../../config/water'
import { FIRE_INITIAL, fire } from '../fire/state'
import { registerFire } from '../fire/timeline'
import { GOLD_BEATS } from '../gold/beats'
import { GOLD_INITIAL, gold } from '../gold/state'
import { registerGold } from '../gold/timeline'
import { registerIdea } from '../idea/timeline'
import { IDEA_INITIAL, idea } from '../idea/state'
import { registerMold } from '../mold/timeline'
import { MOLD_INITIAL, mold } from '../mold/state'
import { registerPrint } from '../print/timeline'
import { PRINT_INITIAL, print } from '../print/state'
import { CAM_INITIAL, FLASK_INITIAL, RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'
import { WATER_BEATS as B } from './beats'
import { WATER_INITIAL, water } from './state'
import { registerWater } from './timeline'

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
  Object.assign(story.ring, RING_INITIAL)
  Object.assign(story.stream, STREAM_INITIAL)
  Object.assign(story.flask, FLASK_INITIAL)
  Object.assign(story.cam, CAM_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, TOTAL_SCREENS)
  offs = [registerIdea(tl), registerPrint(tl), registerMold(tl), registerFire(tl), registerGold(tl), registerWater(tl)]
})

afterEach(() => {
  offs.forEach((off) => off())
  tl.kill()
})

const state = () => ({ flask: snap(story.flask), water: snap(water), gold: snap(gold), cam: snap(story.cam) })
const flaskBottomY = () => FLIP.pivotY + flaskOffset(story.flask).y - FLASK_FLANGE_RADIUS

describe('act 6 timeline', () => {
  it('starts after act 5 is done and takes the copy column after act 5 gives it up', () => {
    expect(B.camFrom).toBeGreaterThanOrEqual(GOLD_BEATS.restTo)
    expect(B.copyIn).toBeGreaterThan(GOLD_BEATS.copyOut)
    expect(B.windowFrom).toBeLessThanOrEqual(B.camFrom)
  })

  it('moves nothing of act 6 before it starts', () => {
    tl.time(B.camFrom - 0.01)
    expect(snap(water)).toEqual(WATER_INITIAL)
    expect(story.flask).toMatchObject({ flip: 1, dip: 0, wash: 0, away: 0 })
    expect(snap(story.cam)).toEqual({ ...CAM.tree })
  })

  it('reaches the bucket view and the bucket before the flask goes down', () => {
    tl.time(B.dipFrom)
    expect(water.bucket).toBe(1)
    expect(story.flask.flip).toBeCloseTo(SIDE_FLIP, 9)
    expect(snap(story.cam)).toEqual({ ...CAM_WATER.bucket })
    expect(story.flask.dip).toBe(0)
  })

  it('boils and steams only once the flask touches the water', () => {
    tl.time(B.boilFrom - 0.001)
    expect(water.boil).toBe(0)
    expect(water.steam).toBe(0)
    tl.time(B.boilFrom)
    expect(flaskBottomY()).toBeLessThanOrEqual(WATER_Y + 0.05)
  })

  it('boils only for the first moments, then the water is calm and white', () => {
    tl.time(B.boilTo)
    expect(water.boil).toBe(1)
    tl.time(B.restFrom)
    expect(water.boil).toBe(0)
    expect(water.milk).toBe(1)
    expect(B.boilOutTo).toBeLessThanOrEqual(B.restFrom)
  })

  it('keeps the flask under the water for the whole timer and dissolves the investment there', () => {
    for (const at of [B.restFrom, B.wash, B.restTo]) {
      tl.time(at)
      expect(story.flask.dip).toBe(1)
    }
    tl.time(B.wash - 0.001)
    expect(story.flask.wash).toBe(0)
    tl.time(B.wash + 0.02)
    expect(story.flask.wash).toBe(1)
    tl.time(B.restTo)
    expect(water.rest).toBe(1)
  })

  it('brings the flask up clean before the tree slides out, then the tree stands as the flask and the bucket go', () => {
    tl.time(B.riseTo)
    expect(story.flask.dip).toBe(0)
    expect(story.flask.wash).toBe(1)
    expect(water.slide).toBe(0)
    tl.time(B.slideTo)
    expect(water.slide).toBe(1)
    expect(water.stand).toBe(0)
    expect(story.flask.away).toBe(0)
    expect(B.standFrom).toBeGreaterThanOrEqual(B.slideTo)
    expect(B.awayFrom).toBeGreaterThanOrEqual(B.slideTo)
  })

  it('leaves the documented end state for act 7 and holds it', () => {
    tl.time(TOTAL_SCREENS)
    expect(story.flask).toMatchObject({ flip: SIDE_FLIP, dip: 0, wash: 1, away: 1, heat: 0, xray: 0 })
    expect(water).toMatchObject({ bucket: 1, boil: 0, milk: 1, steam: 0, rest: 1, drip: 1, slide: 1, stand: 1 })
    expect(water.yaw).toBeCloseTo(RAW.yawTo, 5)
    expect(snap(story.cam)).toEqual({ ...CAM_WATER.raw })
    const held = state()
    tl.time(TOTAL_SCREENS - 0.01)
    tl.time(TOTAL_SCREENS)
    expect(state()).toEqual(held)
  })

  it('restores the end of act 5 exactly when scrubbed back', () => {
    tl.time(B.camFrom - 0.01)
    const before = state()
    tl.time(13.8)
    tl.time(B.camFrom - 0.01)
    expect(state()).toEqual(before)
  })

  it('is a pure function of the scroll position (a jump equals a scrub)', () => {
    tl.time(12.8)
    const jumped = state()
    tl.time(10.0)
    tl.time(12.0)
    tl.time(12.8)
    expect(state()).toEqual(jumped)
    tl.time(0)
    tl.time(13.7)
    const far = state()
    tl.time(TOTAL_SCREENS)
    tl.time(13.7)
    expect(state()).toEqual(far)
  })
})
