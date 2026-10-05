import { describe, expect, it } from 'vitest'
import { computeNormalization } from './normalize'

describe('computeNormalization', () => {
  it('centers the real ring box and scales its height to the target', () => {
    // ring.glb bounds in cm: 2.35 x 2.48 x 1.03, here deliberately off-center
    const n = computeNormalization({ min: [1, 2, -0.5], max: [3.35, 4.48, 0.53] }, 1)
    expect(n.offset[0]).toBeCloseTo(-2.175)
    expect(n.offset[1]).toBeCloseTo(-3.24)
    expect(n.offset[2]).toBeCloseTo(-0.015)
    expect(n.scale).toBeCloseTo(1 / 2.48)
  })

  it('keeps proportions (one uniform scale)', () => {
    const n = computeNormalization({ min: [0, 0, 0], max: [2, 4, 1] }, 2)
    expect(n.scale).toBe(0.5)
  })

  it('rejects a flat or empty box', () => {
    expect(() => computeNormalization({ min: [0, 1, 0], max: [1, 1, 1] }, 1)).toThrow()
  })
})
