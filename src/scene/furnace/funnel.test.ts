import { describe, expect, it } from 'vitest'
import { MOLD } from '../../config/mold'
import { funnelProfile } from './funnel'

describe('funnelProfile', () => {
  it('runs from the flask bottom at the cone radius up to the trunk bottom', () => {
    const p = funnelProfile()
    expect(p[0]).toEqual([MOLD.base.coneRadius, MOLD.flask.bottomY])
    expect(p.at(-1)![1]).toBeCloseTo(MOLD.trunk.bottomY, 9)
    expect(p.at(-1)![0]).toBeCloseTo(MOLD.trunk.radius * 1.4, 9)
  })

  it('narrows and rises monotonically', () => {
    const p = funnelProfile()
    for (let i = 1; i < p.length; i++) {
      expect(p[i][0]).toBeLessThan(p[i - 1][0])
      expect(p[i][1]).toBeGreaterThan(p[i - 1][1])
    }
  })
})
