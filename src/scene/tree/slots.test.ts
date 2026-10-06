import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { MOLD, TREE_SLOTS } from '../../config/mold'
import { PRINT, RING_HALF } from '../../config/print'
import { ringBoxCorners, slotPose } from './slots'

const MARGIN = 0.12

describe('tree slots', () => {
  it('puts each sprue tip on the trunk surface at the slot height', () => {
    TREE_SLOTS.forEach((s, i) => {
      const { position, quaternion } = slotPose(i)
      const tip = new Vector3(0, -(RING_HALF + PRINT.sprue.length), 0).applyQuaternion(quaternion).add(position)
      expect(Math.hypot(tip.x, tip.z)).toBeCloseTo(MOLD.trunk.radius)
      expect(tip.y).toBeCloseTo(s.y)
    })
  })

  it('faces the hero ring to the camera (slot 0 at azimuth 0, ring normal along +Z)', () => {
    const n = new Vector3(0, 0, 1).applyQuaternion(slotPose(0).quaternion)
    expect(n.z).toBeGreaterThan(0.95)
  })

  it('keeps every ring inside the flask and under the investment', () => {
    TREE_SLOTS.forEach((_, i) => {
      for (const c of ringBoxCorners(i)) {
        expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(MOLD.flask.innerRadius - MARGIN)
        expect(c.y).toBeGreaterThanOrEqual(MOLD.flask.bottomY + MARGIN)
        expect(c.y).toBeLessThanOrEqual(MOLD.investment.topY - MARGIN)
      }
    })
  })

  it('keeps rings from touching each other (box centers farther apart than a ring height)', () => {
    for (let i = 0; i < TREE_SLOTS.length; i++)
      for (let j = i + 1; j < TREE_SLOTS.length; j++)
        expect(slotPose(i).position.distanceTo(slotPose(j).position)).toBeGreaterThan(1.0)
  })
})
