import { describe, expect, it } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import { PRINT, RING_COUNT, printRingX } from '../../config/print'
import { blendPose, newPose, ringPose, type Pose } from './pose'

const make = (p: [number, number, number], axis: [number, number, number], angle: number): Pose => ({
  position: new Vector3(...p),
  quaternion: new Quaternion().setFromAxisAngle(new Vector3(...axis).normalize(), angle),
})

describe('blendPose', () => {
  const a = make([0, 0, 0], [0, 0, 1], 0)
  const b = make([2, 4, -6], [0, 1, 0], 1.2)

  it('returns a at t = 0 and b at t = 1', () => {
    const o0 = blendPose(a, b, 0, newPose())
    expect(o0.position.distanceTo(a.position)).toBeLessThan(1e-9)
    expect(o0.quaternion.angleTo(a.quaternion)).toBeLessThan(1e-6)
    const o1 = blendPose(a, b, 1, newPose())
    expect(o1.position.distanceTo(b.position)).toBeLessThan(1e-9)
    expect(o1.quaternion.angleTo(b.quaternion)).toBeLessThan(1e-6)
  })

  it('uses the midpoint position and a unit quaternion at t = 0.5', () => {
    const o = blendPose(a, b, 0.5, newPose())
    expect(o.position.distanceTo(new Vector3(1, 2, -3))).toBeLessThan(1e-9)
    expect(o.quaternion.length()).toBeCloseTo(1)
  })
})

describe('ringPose', () => {
  const identity = new Quaternion()

  it('gives a pure Y translation and identity rotation for a rest ring', () => {
    const o = ringPose({ y: 0.3, flip: 0, yaw: 0, spread: 0 }, 2, newPose())
    expect(o.position.toArray()).toEqual([0, 0.3, 0])
    expect(o.quaternion.angleTo(identity)).toBeLessThan(1e-9)
  })

  it('treats flip = 2 PI like flip = 0 (up to quaternion sign)', () => {
    const o = ringPose({ y: 0, flip: Math.PI * 2, yaw: 0, spread: 0 }, 0, newPose())
    expect(o.quaternion.angleTo(identity)).toBeLessThan(1e-9)
  })

  it('puts every ring at x = 0 with spread 0 (Act 1: one ring) and ring k at printRingX(k) * spread', () => {
    for (let k = 0; k < RING_COUNT; k++) {
      expect(ringPose({ y: 0.2, flip: 1, yaw: 2, spread: 0 }, k, newPose()).position.distanceTo(new Vector3(0, 0.2, 0))).toBe(0)
      for (const spread of [0.5, 1, PRINT.row.liftSpread]) {
        const o = ringPose({ y: -0.1, flip: Math.PI, yaw: 0.6, spread }, k, newPose())
        expect(o.position.x).toBeCloseTo(printRingX(k) * spread, 12)
        expect(o.position.y).toBeCloseTo(-0.1, 12)
        expect(o.position.z).toBe(0)
      }
    }
  })

  it('turns each ring about its own centre: the rotation does not depend on k', () => {
    const r = { y: 0, flip: 2.1, yaw: 0.7, spread: 1 }
    const q0 = ringPose(r, 0, newPose()).quaternion
    for (let k = 1; k < RING_COUNT; k++) expect(ringPose(r, k, newPose()).quaternion.angleTo(q0)).toBeLessThan(1e-6)
  })
})
