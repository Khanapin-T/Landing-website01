import { describe, expect, it } from 'vitest'
import { createSprueGeometry } from './sprue'
import { PRINT, RING_HALF } from '../../config/print'

describe('sprue geometry', () => {
  it('runs from just inside the shank bottom down by the sprue length', () => {
    const g = createSprueGeometry()
    g.computeBoundingBox()
    const b = g.boundingBox!
    expect(b.max.y).toBeGreaterThan(-RING_HALF)
    expect(b.max.y).toBeLessThan(-RING_HALF + 0.05)
    expect(b.min.y).toBeCloseTo(-RING_HALF - PRINT.sprue.length)
    expect(b.max.x).toBeCloseTo(PRINT.sprue.radius)
  })
})
