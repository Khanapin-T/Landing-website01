import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { registerIdea } from './timeline'
import { registerPlaceholder } from '../placeholder'
import { IDEA_INITIAL, idea } from './state'
import { RING_INITIAL, story } from '../../story/store'

let tl: gsap.core.Timeline
let offs: (() => void)[] = []

beforeEach(() => {
  Object.assign(idea, IDEA_INITIAL)
  Object.assign(story.ring, RING_INITIAL)
  tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.set({}, {}, 14.5)
  offs = [registerIdea(tl), registerPlaceholder(tl)]
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
    expect(idea.points).toBe(0)
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

  it('fills surfaces in CAD state, then dissolves into points', () => {
    tl.time(1.9)
    expect(story.ring.fill).toBe(1)
    expect(story.ring.cad).toBe(1)
    tl.time(2.2)
    expect(story.ring.fill).toBe(0)
    expect(idea.edges).toBe(0)
    expect(idea.points).toBe(1)
    expect(idea.dissolve).toBeGreaterThan(0)
    expect(idea.dissolve).toBeLessThan(1)
    tl.time(2.5)
    expect(idea.dissolve).toBe(1)
    expect(idea.grid).toBe(0)
  })

  it('restores every value when scrubbed back to the top', () => {
    tl.time(9)
    tl.time(0)
    expect(idea).toMatchObject(IDEA_INITIAL)
    expect(story.ring).toMatchObject(RING_INITIAL)
  })

  it('hands over to the gold placeholder after act 1 (TEMP until s02)', () => {
    tl.time(3)
    expect(story.ring.fill).toBe(1)
    expect(story.ring.cad).toBe(0)
    expect(story.ring.yaw).toBeGreaterThan(Math.PI * 2)
    tl.time(2.4)
    expect(story.ring.fill).toBe(0)
    expect(story.ring.cad).toBe(1)
  })

  it('removes its tweens when unregistered (StrictMode double mount)', () => {
    offs.forEach((off) => off())
    offs = []
    tl.time(1.9)
    expect(idea).toMatchObject(IDEA_INITIAL)
    expect(story.ring).toMatchObject(RING_INITIAL)
  })
})
