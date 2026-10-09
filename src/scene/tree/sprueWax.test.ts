import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { PRINT, RING_HALF } from '../../config/print'
import { slotPose } from './slots'
import { createSprueGeometry } from '../ring/sprue'
import { SPRUE_TIP_LOCAL, SPRUE_WAX, createSprueWaxGeometry } from './sprueWax'

describe('red wax continuation of a ring sprue', () => {
  const g = createSprueWaxGeometry()
  g.computeBoundingBox()
  const b = g.boundingBox!

  it('is the same cylinder as the sprue (same radius), continuing it past the tip plane', () => {
    expect(b.max.x).toBeCloseTo(PRINT.sprue.radius, 3)
    expect(b.min.x).toBeCloseTo(-PRINT.sprue.radius, 3)
    expect(b.min.y).toBeCloseTo(-SPRUE_WAX.length, 6)
    // A hair above the tip plane, so the joint to the resin sprue has no gap.
    expect(b.max.y).toBeCloseTo(SPRUE_WAX.overlap, 6)
  })

  it('stays inside the trunk at its far end for every slot (it only fills the gap, it does not poke out the other side)', () => {
    const tipOffset = new THREE.Vector3(0, -(RING_HALF + PRINT.sprue.length), 0)
    for (let i = 0; i < 4; i++) {
      const { position, quaternion } = slotPose(i)
      const tip = tipOffset.clone().applyQuaternion(quaternion).add(position)
      const end = new THREE.Vector3(0, -SPRUE_WAX.length, 0).applyQuaternion(quaternion).add(tip)
      // Distance of the far end center from the trunk axis (trunk axis = world Y), plus the stub radius, stays inside the trunk.
      expect(Math.hypot(end.x, end.z) + PRINT.sprue.radius).toBeLessThan(MOLD.trunk.radius)
    }
  })
})

describe('sprue tip position', () => {
  it('SPRUE_TIP_LOCAL is the lowest point of the ring sprue in the ring-local frame (where the wax stub starts)', () => {
    const sprue = createSprueGeometry()
    sprue.computeBoundingBox()
    expect(SPRUE_TIP_LOCAL[0]).toBe(0)
    expect(SPRUE_TIP_LOCAL[1]).toBeCloseTo(sprue.boundingBox!.min.y, 6)
    expect(SPRUE_TIP_LOCAL[2]).toBe(0)
  })
})
