import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { registerIdea } from './timeline'
import { IDEA_INITIAL, idea } from './state'
import { RING_INITIAL, STREAM_INITIAL, story } from '../../story/store'

let tl: gsap.core.Timeline
let offs: (() => void)[] = []

beforeEach(() => {
  Object.assign(idea, IDEA_INITIAL)
  Object.assign(story.ring, RING_INITIAL)
  Object.assign(story.stream, STREAM_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, 14.5)
  offs = [registerIdea(tl)]
})

afterEach(() => {
  offs.forEach((off) => off())
  tl.kill()
})

describe('act 1 timeline', () => {
  it('is blank under the intro title', () => {
    tl.time(0.3)
    expect(idea.draw).toBe(0)
    expect(story.ring.fill).toBe(0)
    expect(story.stream.opacity).toBe(0)
    expect(idea.grid).toBe(1)
  })

  it('draws the edges, then the dimension lines', () => {
    tl.time(0.7)
    expect(idea.draw).toBeCloseTo(0.5)
    tl.time(1.0)
    expect(idea.draw).toBe(1)
    expect(idea.dims).toBeCloseTo(0.75)
    tl.time(1.4)
    expect(idea.dimsOpacity).toBe(0)
  })

  it('turns the ring exactly 360 deg around Y', () => {
    tl.time(1.2)
    expect(story.ring.yaw).toBeCloseTo(0)
    tl.time(2.06)
    expect(story.ring.yaw).toBeCloseTo(Math.PI * 2)
  })

  it('fills surfaces in CAD state, then dissolves into the resin stream', () => {
    tl.time(1.9)
    expect(story.ring.fill).toBe(1)
    expect(story.ring.cad).toBe(1)
    tl.time(2.2)
    expect(story.ring.fill).toBe(0)
    expect(idea.edges).toBe(0)
    expect(story.stream.opacity).toBe(1)
    expect(story.stream.fall).toBeGreaterThan(0)
    expect(story.stream.fall).toBeLessThan(1)
    tl.time(2.5)
    expect(story.stream.fall).toBe(1)
    expect(idea.grid).toBe(0)
    // The points stay: they wait in the resin bed and feed the print in Act 2.
    expect(story.stream.opacity).toBe(1)
  })

  it('restores every value when scrubbed back to the top', () => {
    tl.time(9)
    tl.time(0)
    expect(idea).toMatchObject(IDEA_INITIAL)
    expect(story.ring).toMatchObject(RING_INITIAL)
    expect(story.stream).toMatchObject(STREAM_INITIAL)
  })

  it('removes its tweens when unregistered (StrictMode double mount)', () => {
    offs.forEach((off) => off())
    offs = []
    tl.time(1.9)
    expect(idea).toMatchObject(IDEA_INITIAL)
    expect(story.ring).toMatchObject(RING_INITIAL)
  })
})
