import { describe, expect, it } from 'vitest'
import { ringBoxCorners } from '../scene/tree/slots'
import { MOLD } from './mold'
import { BURN, FLIP, FUNNEL, burnFrontY, detachAt, frontProgress } from './fire'

describe('burn front', () => {
  it('is far above everything when nothing burns', () => {
    expect(burnFrontY(0)).toBe(BURN.off)
    expect(burnFrontY(-1)).toBe(BURN.off)
  })

  it('sweeps from the tree top to just under the trunk and then holds', () => {
    expect(burnFrontY(0.001)).toBeCloseTo(BURN.topY, 2)
    expect(burnFrontY(1 - BURN.trail)).toBeCloseTo(BURN.bottomY, 6)
    expect(burnFrontY(1)).toBeCloseTo(BURN.bottomY, 9)
    expect(frontProgress(2)).toBe(1)
  })

  it('detaches a point exactly when the front reaches its height', () => {
    for (const y of [BURN.bottomY, -0.5, 0, 0.7, BURN.topY]) {
      expect(burnFrontY(detachAt(y) + 1e-9)).toBeCloseTo(y, 4)
    }
  })

  it('leaves every point time to flow out before burn reaches 1', () => {
    expect(detachAt(BURN.bottomY) + BURN.trail).toBeCloseTo(1, 6)
    expect(detachAt(BURN.topY)).toBe(0)
  })

  it('starts above every ring corner and ends under the trunk bottom', () => {
    const top = Math.max(...[0, 1, 2, 3].flatMap((i) => ringBoxCorners(i).map((c) => c.y)))
    expect(BURN.topY).toBeGreaterThanOrEqual(top)
    expect(BURN.bottomY).toBeLessThanOrEqual(MOLD.trunk.bottomY)
  })
})

describe('funnel exit and flip pivot', () => {
  it('lets the particles leave under the foot', () => {
    expect(FUNNEL.exitY).toBeLessThan(MOLD.flask.bottomY - MOLD.foot.height)
  })

  it('flips about the middle of the flask including its foot', () => {
    const bottom = MOLD.flask.bottomY - MOLD.foot.height
    const top = MOLD.flask.bottomY + MOLD.flask.height
    expect(FLIP.pivotY).toBeCloseTo((bottom + top) / 2, 9)
  })
})
