import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { PRINT, RING_HALF } from '../../config/print'
import { slotPose } from './slots'
import { createSprueGeometry } from '../ring/sprue'
import { SPRUE_TIP_LOCAL, SPRUE_WAX, STUB_FROM, createSprueWaxGeometry, stubGrowth } from './sprueWax'
import { ASSEMBLY } from '../../config/assembly'
import { RING_COUNT } from '../../config/print'
import { RING_INITIAL } from '../../story/store'
import { ringPlacement } from '../ring/placement'
import { newPose } from '../ring/pose'

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

describe('wax stub growth (as the ring seats)', () => {
  it('is zero until the ring is on its final slide, grows monotonically and is complete when the ring is seated', () => {
    expect(STUB_FROM).toBeGreaterThanOrEqual(ASSEMBLY.curve)
    expect(stubGrowth(0)).toBe(0)
    expect(stubGrowth(STUB_FROM)).toBe(0)
    expect(stubGrowth(1)).toBe(1)
    let prev = 0
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const g = stubGrowth(t)
      expect(g).toBeGreaterThanOrEqual(prev)
      prev = g
    }
  })

  it('stays ahead of the incoming sprue: the ring tip comes down the stub axis and meets the stub only at the joint overlap', () => {
    const tipLocal = new THREE.Vector3(...SPRUE_TIP_LOCAL)
    const o = newPose()
    for (let k = 0; k < RING_COUNT; k++) {
      const slot = slotPose(k)
      const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(slot.quaternion)
      const slotTip = tipLocal.clone().applyQuaternion(slot.quaternion).add(slot.position)
      for (let t = STUB_FROM; t <= 1.0001; t += 0.005) {
        const f = Math.min(t, 1)
        const flight: [number, number, number, number] = [0, 0, 0, 0]
        flight[k] = f
        const scale = ringPlacement({ ...RING_INITIAL, flip: Math.PI * 2, spread: 1.4, scale: 0.45, flight }, k, o)
        expect(scale).toBe(1)
        const tip = tipLocal.clone().applyQuaternion(o.quaternion).add(o.position).sub(slotTip)
        // On the stub axis (the sprue comes straight down it), above the stub's top end.
        expect(tip.clone().cross(axis).length()).toBeLessThan(1e-9)
        expect(tip.dot(axis) + SPRUE_WAX.overlap).toBeGreaterThanOrEqual(stubGrowth(f) * SPRUE_WAX.overlap - 1e-12)
      }
    }
  })
})
