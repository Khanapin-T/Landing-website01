import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { registerIdea } from '../idea/timeline'
import { IDEA_INITIAL, idea } from '../idea/state'
import { registerPrint } from './timeline'
import { PRINT_INITIAL, print } from './state'
import { PRINT_BEATS } from './beats'
import { Vector3 } from 'three'
import { CURE_OFF, LIFT_CAM, PRINT, RING_COUNT, RING_HALF, printPose } from '../../config/print'
import { newPose, ringPose } from '../../scene/ring/pose'
import { RING_HALF_EXTENTS } from '../../scene/tree/slots'
import { CAM_INITIAL, RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'

let tl: gsap.core.Timeline
let offs: (() => void)[] = []

beforeEach(() => {
  Object.assign(idea, IDEA_INITIAL)
  Object.assign(print, PRINT_INITIAL)
  Object.assign(story.ring, RING_INITIAL)
  Object.assign(story.stream, STREAM_INITIAL)
  Object.assign(story.cam, CAM_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, 14.5)
  offs = [registerIdea(tl), registerPrint(tl)]
})

afterEach(() => {
  offs.forEach((off) => off())
  tl.kill()
})

describe('act 2 ring size', () => {
  it('prints the rings smaller, then grows them to full size while they turn over (they go onto the tree at that size)', () => {
    tl.time(2.4)
    expect(story.ring.scale).toBe(1)
    tl.time(2.6)
    expect(story.ring.scale).toBeCloseTo(PRINT.scale, 9)
    tl.time(3.5)
    expect(story.ring.scale).toBeCloseTo(PRINT.scale, 9)
    tl.time(PRINT_BEATS.growFrom)
    expect(story.ring.scale).toBeCloseTo(PRINT.scale, 9)
    expect(PRINT_BEATS.growFrom).toBeGreaterThanOrEqual(PRINT_BEATS.liftFrom)
    expect(PRINT_BEATS.growTo).toBeLessThanOrEqual(PRINT_BEATS.flipTo)
    tl.time((PRINT_BEATS.growFrom + PRINT_BEATS.growTo) / 2)
    expect(story.ring.scale).toBeGreaterThan(PRINT.scale)
    expect(story.ring.scale).toBeLessThan(1)
    tl.time(PRINT_BEATS.growTo)
    expect(story.ring.scale).toBe(1)
    tl.time(4.0)
    expect(story.ring.scale).toBe(1)
    tl.time(2.4)
    expect(story.ring.scale).toBe(1)
  })

  it('pulls the camera back from CAM_INITIAL to LIFT_CAM while the rings grow, and holds it there into act 3', () => {
    tl.time(PRINT_BEATS.camFrom)
    expect(story.cam).toMatchObject(CAM_INITIAL)
    tl.time(PRINT_BEATS.camTo)
    expect(story.cam).toMatchObject(LIFT_CAM)
    tl.time(4.0)
    expect(story.cam).toMatchObject(LIFT_CAM)
    tl.time(3.0)
    expect(story.cam).toMatchObject(CAM_INITIAL)
  })

  it('keeps the copy on until act 3 starts', () => {
    expect(PRINT_BEATS.copyOut).toBeGreaterThanOrEqual(PRINT_BEATS.flipTo - 0.05)
    expect(PRINT_BEATS.copyOut).toBeLessThanOrEqual(4.0)
  })
})

describe('act 2 four-ring grid', () => {
  it('shows one centred ring before the switch, then four rings in the print grid', () => {
    tl.time(2.49)
    expect(story.ring.spread).toBe(0)
    tl.time(2.505)
    expect(story.ring.spread).toBe(1)
    for (const t of [2.8, 3.3, PRINT_BEATS.crumbleTo, PRINT_BEATS.liftFrom]) {
      tl.time(t)
      expect(story.ring.spread).toBe(1)
    }
    tl.time(2.4)
    expect(story.ring.spread).toBe(0)
  })

  it('moves the front two out while the rings leave the plate and turn over', () => {
    const B = PRINT_BEATS
    expect(B.spreadFrom).toBeGreaterThanOrEqual(B.crumbleTo)
    expect(B.spreadFrom).toBeLessThanOrEqual(B.flipFrom)
    expect(B.spreadTo).toBeLessThanOrEqual(B.flipTo)
    tl.time(B.spreadTo)
    expect(story.ring.spread).toBeCloseTo(PRINT.grid.liftSpread, 9)
    tl.time(B.flipTo)
    expect(story.ring.spread).toBeCloseTo(PRINT.grid.liftSpread, 9)
  })

  it('never lets two rings (with sprues) overlap while they turn over', () => {
    // Conservative: each ring's x and z intervals (rotated bounding box corners plus the sprue tip) at the shared pose;
    // two rings are apart when either interval pair is (the rows are apart in z, the rings of a row in x).
    const S = PRINT.scale
    const local: Vector3[] = []
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        for (const sz of [-1, 1]) local.push(new Vector3(sx * RING_HALF_EXTENTS.x, sy * RING_HALF_EXTENTS.y, sz * RING_HALF_EXTENTS.z))
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) local.push(new Vector3(sx * PRINT.sprue.radius, -RING_HALF - PRINT.sprue.length, sz * PRINT.sprue.radius))
    const pose = newPose()
    const p = new Vector3()
    const B = PRINT_BEATS
    let checked = 0
    for (let t = B.crumbleTo; t <= 4.0 + 1e-9; t += 0.0025) {
      tl.time(t)
      const box = Array.from({ length: RING_COUNT }, (_, k) => {
        ringPose(story.ring, k, pose)
        const b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }
        for (const c of local) {
          p.copy(c).multiplyScalar(S).applyQuaternion(pose.quaternion).add(pose.position)
          b.x0 = Math.min(b.x0, p.x)
          b.x1 = Math.max(b.x1, p.x)
          b.z0 = Math.min(b.z0, p.z)
          b.z1 = Math.max(b.z1, p.z)
        }
        return b
      })
      for (let i = 0; i < RING_COUNT; i++)
        for (let j = i + 1; j < RING_COUNT; j++) {
          const a = box[i]
          const b = box[j]
          const gap = Math.max(b.x0 - a.x1, a.x0 - b.x1, b.z0 - a.z1, a.z0 - b.z1)
          expect(gap, `t = ${t.toFixed(4)}, rings ${i}/${j}`).toBeGreaterThan(0.005)
          checked++
        }
    }
    expect(checked).toBeGreaterThan(500)
  })

  it('keeps every ring off the tree (flight 0) through act 2', () => {
    for (const t of [2.4, 2.6, 3.3, 3.8, 3.97, 4.0]) {
      tl.time(t)
      expect([...story.ring.flight]).toEqual([0, 0, 0, 0])
    }
  })
})

describe('act 2 supports', () => {
  it('carries the supports with the printed ring, then leaves them where the print ended', () => {
    for (const t of [2.8, 3.2, 3.5]) {
      tl.time(t)
      expect(print.sup).toBeCloseTo(story.ring.y, 9)
    }
    tl.time(3.9)
    expect(print.sup).toBeCloseTo(printPose(1).ringY, 9)
  })

  it('crumbles the supports at 100% while the ring still hangs on the plate, then the ring leaves and turns over', () => {
    const B = PRINT_BEATS
    expect(B.crumbleFrom).toBeGreaterThanOrEqual(B.printTo)
    expect(B.liftFrom).toBeGreaterThanOrEqual(B.crumbleTo)
    expect(B.flipFrom).toBeGreaterThanOrEqual(B.crumbleTo)
    tl.time(B.crumbleFrom - 0.001)
    expect(print.drop).toBe(0)
    tl.time((B.crumbleFrom + B.crumbleTo) / 2)
    expect(print.drop).toBeGreaterThan(0)
    expect(print.drop).toBeLessThan(1)
    // Still hanging under the plate, upside down and small.
    expect(story.ring.y).toBeCloseTo(printPose(1).ringY, 9)
    expect(story.ring.flip).toBeCloseTo(Math.PI, 5)
    expect(story.ring.scale).toBeCloseTo(PRINT.scale, 9)
    expect(print.plate).toBeCloseTo(printPose(1).plateY, 9)
    tl.time(B.crumbleTo)
    expect(print.drop).toBe(1)
    tl.time(3.3)
    expect(print.drop).toBe(0)
  })
})

describe('act 2 timeline', () => {
  it('lights the resin bed as the act 1 points pour in, and keeps the points there', () => {
    tl.time(2.1)
    expect(print.bed).toBe(0)
    tl.time(2.5)
    expect(print.bed).toBe(1)
    expect(story.stream.fall).toBe(1)
    expect(story.stream.feed).toBe(0)
    expect(story.stream.opacity).toBe(1)
  })

  it('feeds the stream into the cure front at the print pace, then the points are gone', () => {
    for (const t of [2.9, 3.2, 3.5]) {
      tl.time(t)
      expect(story.stream.feed).toBeCloseTo(print.grow)
      expect(story.stream.opacity).toBe(1)
    }
    tl.time(3.61)
    expect(story.stream.feed).toBe(1)
    expect(story.stream.opacity).toBe(0)
  })

  it('switches the ring at 2.5 while it is hidden under the cure plane', () => {
    tl.time(2.49)
    expect(story.ring.cureY).toBe(CURE_OFF)
    expect(story.ring.flip).toBe(0)
    // No in-between frame: right after the switch everything is in its print state already.
    tl.time(2.505)
    expect(story.ring.flip).toBeCloseTo(Math.PI)
    expect(story.ring.cureY).toBe(PRINT.cureY)
    expect(story.ring.fill).toBe(1)
    tl.time(2.6)
    expect(story.ring.fill).toBe(1)
    expect(story.ring.cad).toBe(0)
    expect(story.ring.resin).toBe(1)
    expect(story.ring.sprue).toBe(1)
    expect(story.ring.flip).toBeCloseTo(Math.PI)
    expect(story.ring.cureY).toBe(PRINT.cureY)
    // Nothing printed yet: the part's top is at or below the cure plane.
    expect(story.ring.y + (RING_HALF + PRINT.sprue.length) * PRINT.scale).toBeLessThanOrEqual(PRINT.cureY + 1e-6)
  })

  it('brings the plate down onto the cure plane before printing', () => {
    tl.time(2.5)
    expect(print.plate).toBeCloseTo(PRINT.plate.parkedY)
    tl.time(2.75)
    expect(print.plate).toBeCloseTo(PRINT.cureY)
  })

  it('moves plate and part together while printing', () => {
    for (const t of [2.8, 3.0, 3.2, 3.5]) {
      tl.time(t)
      const g = print.grow
      expect(g).toBeGreaterThan(0)
      expect(g).toBeLessThan(1)
      expect(print.plate).toBeCloseTo(printPose(g).plateY)
      expect(story.ring.y).toBeCloseTo(printPose(g).ringY)
      expect(print.glow).toBe(1)
    }
  })

  it('dims the bed light as the print goes, gone by 100% (author: no green glow under the finished print)', () => {
    tl.time(PRINT_BEATS.printFrom)
    expect(print.bed).toBe(1)
    tl.time((PRINT_BEATS.printFrom + PRINT_BEATS.printTo) / 2)
    expect(print.bed).toBeGreaterThan(0)
    expect(print.bed).toBeLessThan(1)
    tl.time(PRINT_BEATS.printTo)
    expect(print.bed).toBe(0)
    expect(print.glow).toBe(0)
  })

  it('lifts the plate out of the frame, turns the four rings upright at full size in the spread grid at y = 0 and clears the clip', () => {
    tl.time(3.7)
    expect(story.ring.cureY).toBe(CURE_OFF)
    tl.time(4.0)
    expect(print.grow).toBe(1)
    expect(print.glow).toBe(0)
    expect(print.plate).toBeCloseTo(PRINT.plate.liftY)
    expect(print.bed).toBe(0)
    expect(story.ring.flip).toBeCloseTo(Math.PI * 2)
    expect(story.ring.y).toBeCloseTo(0)
    expect(story.ring.resin).toBe(1)
    expect(story.ring.sprue).toBe(1)
    expect(story.ring.spread).toBeCloseTo(PRINT.grid.liftSpread, 9)
    expect(story.ring.scale).toBe(1)
  })

  it('jumping to a time equals scrubbing to it', () => {
    const times = [2.3, 2.505, 2.9, 3.4, 3.65, 3.75, 3.85, 3.97, 4.0]
    const scrubbed = times.map((t) => {
      tl.time(t)
      return { ring: { ...story.ring, flight: [...story.ring.flight] }, print: { ...print }, stream: { ...story.stream } }
    })
    for (let i = times.length - 1; i >= 0; i--) {
      tl.time(0)
      tl.time(times[i])
      expect({ ring: { ...story.ring, flight: [...story.ring.flight] }, print: { ...print }, stream: { ...story.stream } }).toEqual(scrubbed[i])
    }
  })

  it('restores act 1 exactly when scrubbed back from later acts', () => {
    tl.time(9)
    tl.time(1.9)
    expect(story.ring.flip).toBe(0)
    expect(story.ring.y).toBe(0)
    expect(story.ring.resin).toBe(0)
    expect(story.ring.sprue).toBe(0)
    expect(story.ring.cad).toBe(1)
    expect(story.ring.cureY).toBe(CURE_OFF)
    expect(story.ring.fill).toBe(1)
    expect(story.ring.spread).toBe(0)
    tl.time(0)
    expect(story.ring).toMatchObject(RING_INITIAL)
    expect(print).toMatchObject(PRINT_INITIAL)
    expect(story.stream).toMatchObject(STREAM_INITIAL)
  })
})
