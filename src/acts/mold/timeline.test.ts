import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { TOTAL_SCREENS } from '../../config/acts'
import { CAM } from '../../config/mold'
import { PRINT, RING_COUNT } from '../../config/print'
import { registerIdea } from '../idea/timeline'
import { IDEA_INITIAL, idea } from '../idea/state'
import { registerPrint } from '../print/timeline'
import { PRINT_INITIAL, print } from '../print/state'
import { content } from '../../content'
import { ASSEMBLY } from '../../config/assembly'
import { MOLD_BEATS as B } from './beats'
import { registerMold } from './timeline'
import { MOLD_INITIAL, mold } from './state'
import { CAM_INITIAL, FLASK_INITIAL, RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'

/** Plain copy without GSAP's `_gsap` cache (it is also added to tweened arrays such as `story.ring.flight`). */
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
    expect([...story.ring.flight]).toEqual([0, 0, 0, 0])
    expect(snap(mold)).toEqual(MOLD_INITIAL)
  })

  it('grows the trunk once the base has landed, while all four rings still hover in their row', () => {
    tl.time(B.trunkFrom)
    // power2.out: within 0.007 of its seat (MOLD.base.dropOffset * 0.0016).
    expect(mold.base).toBeGreaterThan(0.998)
    expect(mold.trunk).toBe(0)
    tl.time((B.trunkFrom + B.trunkTo) / 2)
    expect(mold.trunk).toBeGreaterThan(0)
    expect(mold.trunk).toBeLessThan(1)
    expect([...story.ring.flight]).toEqual([0, 0, 0, 0])
    tl.time(B.trunkTo)
    expect(mold.trunk).toBe(1)
  })

  it('flies the rings only after the trunk has (almost) grown, in ASSEMBLY.order, one after another', () => {
    expect(B.flightFrom).toBeGreaterThan(B.trunkFrom)
    tl.time(B.flightFrom)
    expect([...story.ring.flight]).toEqual([0, 0, 0, 0])
    expect(mold.trunk).toBeGreaterThan(0.95)
    ASSEMBLY.order.forEach((k, i) => {
      const start = B.flightFrom + i * B.flightStagger
      tl.time(start)
      expect(story.ring.flight[k]).toBe(0)
      // The rings after it have not started; the ones before it are on their way or seated.
      ASSEMBLY.order.slice(i + 1).forEach((j) => expect(story.ring.flight[j]).toBe(0))
      ASSEMBLY.order.slice(0, i).forEach((j) => expect(story.ring.flight[j]).toBeGreaterThan(0.5))
      tl.time(start + B.flightLen)
      expect(story.ring.flight[k]).toBe(1)
    })
    // The size comes from each ring's flight (placement.ts), not from a global tween.
    expect(story.ring.scale).toBeCloseTo(PRINT.scale, 9)
  })

  it('seats the last ring before the flask comes down', () => {
    const lastSeat = B.flightFrom + (RING_COUNT - 1) * B.flightStagger + B.flightLen
    expect(lastSeat).toBeLessThanOrEqual(B.flaskFrom - 0.03)
    tl.time(lastSeat)
    expect([...story.ring.flight]).toEqual([1, 1, 1, 1])
    expect(mold.flask).toBe(0)
  })

  it('pulls the camera back and raises the base before the trunk grows', () => {
    expect(B.camTo).toBeLessThanOrEqual(B.flightFrom)
    expect(B.baseInTo).toBeLessThanOrEqual(B.trunkFrom + 0.02)
    tl.time(B.camTo)
    expect(snap(story.cam)).toEqual(CAM.tree)
    expect(mold.base).toBe(1)
  })

  it('restores the hovering row when scrubbed back through the flights, and a jump lands where a scrub does', () => {
    const state = () => ({ ring: snap(story.ring), mold: snap(mold), cam: snap(story.cam) })
    const probes = [4.3, 4.47, 4.52, 4.61, 4.66, 4.73, 4.8, 4.9, 5.0]
    // Scrub forward in small steps, remembering the state at each probe.
    const scrubbed = new Map<number, ReturnType<typeof state>>()
    for (let i = 0; i <= 440; i++) {
      const t = 3.9 + i * 0.0025
      tl.time(t)
      const p = probes.find((q) => Math.abs(t - q) < 1e-6)
      if (p !== undefined) {
        tl.time(p)
        scrubbed.set(p, state())
      }
    }
    expect(scrubbed.size).toBe(probes.length)
    for (const p of probes) {
      tl.time(0)
      tl.time(p)
      expect(state(), `jump to ${p}`).toEqual(scrubbed.get(p))
    }
    // Back to the end of the print: the rings hover in their row again, no trunk.
    tl.time(9)
    for (let t = 9; t >= 3.99; t -= 0.01) tl.time(t)
    tl.time(3.99)
    expect([...story.ring.flight]).toEqual([0, 0, 0, 0])
    expect(mold.trunk).toBe(0)
  })

  it('lowers the flask after the assembly', () => {
    tl.time(B.flaskFrom)
    expect(mold.flask).toBe(0)
    tl.time(B.flaskTo)
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
    expect(snap(story.ring)).toEqual(ring)
    expect(snap(mold)).toEqual(MOLD_INITIAL)
    expect(story.cam).toMatchObject(CAM_INITIAL)
    expect([...story.ring.flight]).toEqual([0, 0, 0, 0])
    tl.time(0)
    expect(snap(story.ring)).toEqual(snap(RING_INITIAL))
    expect(story.cam).toMatchObject(CAM_INITIAL)
    expect(snap(mold)).toEqual(MOLD_INITIAL)
  })
})
