import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { registerIdea } from '../idea/timeline'
import { IDEA_INITIAL, idea } from '../idea/state'
import { registerPrint } from './timeline'
import { PRINT_INITIAL, print } from './state'
import { PRINT_BEATS } from './beats'
import { CURE_OFF, PRINT, RING_HALF, printPose } from '../../config/print'
import { RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'

let tl: gsap.core.Timeline
let offs: (() => void)[] = []

beforeEach(() => {
  Object.assign(idea, IDEA_INITIAL)
  Object.assign(print, PRINT_INITIAL)
  Object.assign(story.ring, RING_INITIAL)
  Object.assign(story.stream, STREAM_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, 14.5)
  offs = [registerIdea(tl), registerPrint(tl)]
})

afterEach(() => {
  offs.forEach((off) => off())
  tl.kill()
})

describe('act 2 ring size', () => {
  it('prints the ring smaller and keeps it small while it turns over (no close-up of the bare ring)', () => {
    tl.time(2.4)
    expect(story.ring.scale).toBe(1)
    tl.time(2.6)
    expect(story.ring.scale).toBeCloseTo(PRINT.scale, 9)
    tl.time(3.5)
    expect(story.ring.scale).toBeCloseTo(PRINT.scale, 9)
    tl.time(PRINT_BEATS.flipTo)
    expect(story.ring.scale).toBeCloseTo(PRINT.scale, 9)
    tl.time(2.4)
    expect(story.ring.scale).toBe(1)
  })

  it('keeps the copy on until act 3 starts', () => {
    expect(PRINT_BEATS.copyOut).toBeGreaterThanOrEqual(PRINT_BEATS.flipTo - 0.05)
    expect(PRINT_BEATS.copyOut).toBeLessThanOrEqual(4.0)
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

  it('lifts the plate away, flips the ring upright to the center and clears the clip', () => {
    tl.time(3.7)
    expect(story.ring.cureY).toBe(CURE_OFF)
    tl.time(4.0)
    expect(print.grow).toBe(1)
    expect(print.glow).toBe(0)
    expect(print.plate).toBeCloseTo(PRINT.plate.parkedY)
    expect(print.bed).toBe(0)
    expect(story.ring.flip).toBeCloseTo(Math.PI * 2)
    expect(story.ring.y).toBeCloseTo(0)
    expect(story.ring.resin).toBe(1)
    expect(story.ring.sprue).toBe(1)
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
    tl.time(0)
    expect(story.ring).toMatchObject(RING_INITIAL)
    expect(print).toMatchObject(PRINT_INITIAL)
    expect(story.stream).toMatchObject(STREAM_INITIAL)
  })
})
