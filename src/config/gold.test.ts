import { describe, expect, it } from 'vitest'
import { ringBoxCorners } from '../scene/tree/slots'
import { FLIP, FUNNEL } from './fire'
import { CAM } from './mold'
import { FILL, REST_SECONDS, arriveAt, fillFrontY, fillProgress, goldFillVisible, goldGlow, pourVisible, restClock } from './gold'

describe('fill front', () => {
  it('shows nothing until the fill starts', () => {
    expect(fillFrontY(0)).toBe(FILL.off)
    expect(fillFrontY(-1)).toBe(FILL.off)
  })

  it('holds at the funnel mouth while the stream is still arriving, then rises to the top and holds', () => {
    expect(fillFrontY(0.001)).toBeCloseTo(FILL.startY, 2)
    expect(fillFrontY(FILL.trail)).toBeCloseTo(FILL.startY, 9)
    expect(fillFrontY(1)).toBeCloseTo(FILL.topY, 9)
    expect(fillProgress(2)).toBe(1)
  })

  it('a point arrives exactly when the front reaches its height', () => {
    for (const y of [FILL.startY, -0.5, 0, 0.7, FILL.topY]) {
      expect(fillFrontY(arriveAt(y) + 1e-9)).toBeCloseTo(y, 4)
    }
  })

  it('gives every point time to fly in before the front reaches it', () => {
    expect(arriveAt(FILL.startY)).toBeCloseTo(FILL.trail, 9)
    expect(arriveAt(-99)).toBeCloseTo(FILL.trail, 9)
    expect(arriveAt(FILL.topY)).toBeCloseTo(1, 9)
  })

  it('covers every ring corner', () => {
    const top = Math.max(...[0, 1, 2, 3].flatMap((i) => ringBoxCorners(i).map((c) => c.y)))
    expect(FILL.topY).toBeGreaterThanOrEqual(top)
  })

  it('starts the stream above the frame once the flask is flipped', () => {
    const worldY = 2 * FLIP.pivotY - FILL.streamY
    const frameTop = CAM.tree.look + CAM.tree.z * Math.tan((30 * Math.PI) / 360)
    expect(worldY).toBeGreaterThan(frameTop)
    expect(FILL.streamY).toBeLessThan(FUNNEL.exitY)
  })
})

describe('goldGlow', () => {
  it('is fully molten at the start and cold gold once cooled', () => {
    expect(goldGlow(0, 0)).toBeCloseTo(1, 9)
    expect(goldGlow(1, 1)).toBe(0)
  })

  it('flashes when the metal has just filled the cavity, then settles', () => {
    expect(goldGlow(1, 0.03)).toBeGreaterThan(1.5)
    expect(goldGlow(1, 0.5)).toBeLessThan(1)
  })

  it('never flashes while still filling', () => {
    expect(goldGlow(0.5, 0)).toBeCloseTo(1, 9)
  })
})

describe('flip-aware visibility gates', () => {
  const on = { fill: 0.5, xray: 1, flip: 1 }

  it('shows the fill and the pour only while the flask is fully flipped', () => {
    expect(goldFillVisible(on)).toBe(true)
    expect(pourVisible(on)).toBe(true)
    expect(goldFillVisible({ ...on, flip: 0.5 })).toBe(false)
    expect(pourVisible({ ...on, flip: 0.5 })).toBe(false)
  })

  it('hides both without X-ray or before the fill starts', () => {
    expect(goldFillVisible({ ...on, xray: 0 })).toBe(false)
    expect(pourVisible({ ...on, xray: 0 })).toBe(false)
    expect(goldFillVisible({ ...on, fill: 0 })).toBe(false)
    expect(pourVisible({ ...on, fill: 0 })).toBe(false)
  })

  it('ends the pour at a full cavity while the fill stays visible', () => {
    expect(pourVisible({ ...on, fill: 1 })).toBe(false)
    expect(goldFillVisible({ ...on, fill: 1 })).toBe(true)
  })
})

describe('restClock', () => {
  it('runs from 00:00 to 10:00 and clamps', () => {
    expect(REST_SECONDS).toBe(600)
    expect(restClock(0)).toBe('00:00')
    expect(restClock(0.5)).toBe('05:00')
    expect(restClock(1)).toBe('10:00')
    expect(restClock(-3)).toBe('00:00')
    expect(restClock(9)).toBe('10:00')
  })
})
