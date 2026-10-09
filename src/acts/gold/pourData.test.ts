import { describe, expect, it } from 'vitest'
import { FILL } from '../../config/gold'
import { mulberry32 } from '../../lib/random'
import { POUR_COUNTS, pourBuffers } from './pourData'

describe('pourBuffers', () => {
  const points = new Float32Array([0, FILL.startY, 0, 0.3, 0.2, 0.1, -0.2, FILL.topY, 0.4])
  const b = pourBuffers(points, mulberry32(3))

  it('keeps the points and gives every point a seed', () => {
    expect(b.count).toBe(3)
    expect(Array.from(b.position)).toEqual(Array.from(points))
    expect(b.seed).toHaveLength(3)
    for (const s of b.seed) {
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThan(1)
    }
  })

  it('arrives when the front reaches the point: the funnel mouth first (after the stream trail), the top last', () => {
    expect(b.arrive[0]).toBeCloseTo(FILL.trail, 6)
    expect(b.arrive[2]).toBeCloseTo(1, 6)
    expect(b.arrive[0]).toBeLessThan(b.arrive[1])
    expect(b.arrive[1]).toBeLessThan(b.arrive[2])
  })

  it('keeps the point budget modest (the fill is seen for 1 screen)', () => {
    const total = POUR_COUNTS.trunk + 4 * POUR_COUNTS.ring + 4 * POUR_COUNTS.sprue
    expect(total).toBeLessThanOrEqual(8000)
  })
})
