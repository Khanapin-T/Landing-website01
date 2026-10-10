import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { ASSEMBLY } from '../../config/assembly'
import { PRINT, RING_COUNT } from '../../config/print'
import { RING_INITIAL, type RingState } from '../../story/store'
import { slotPose } from '../tree/slots'
import { flightScale, ringPlacement } from './placement'
import { newPose, ringPose } from './pose'

/** The rings where Act 2 leaves them: upright, small, the front two moved outward. */
const row = (flight: RingState['flight']): RingState => ({
  ...RING_INITIAL,
  fill: 1,
  resin: 1,
  sprue: 1,
  flip: Math.PI * 2,
  yaw: Math.PI * 2 + 0.6,
  y: 0,
  spread: PRINT.grid.liftSpread,
  scale: PRINT.scale,
  flight,
})

const only = (k: number, t: number): RingState['flight'] => {
  const f: RingState['flight'] = [0, 0, 0, 0]
  f[k] = t
  return f
}

const axis = (k: number) => new Vector3(0, 1, 0).applyQuaternion(slotPose(k).quaternion)

describe('ring placement (Act 2 end pose -> tree slot)', () => {
  it('keeps every ring exactly in its Act 2 end pose at the print size with flight 0 (no pop at the hand-over)', () => {
    const r = row([0, 0, 0, 0])
    for (let k = 0; k < RING_COUNT; k++) {
      const o = newPose()
      const s = ringPlacement(r, k, o)
      const free = ringPose(r, k, newPose())
      expect(o.position.distanceTo(free.position)).toBe(0)
      expect(o.quaternion.angleTo(free.quaternion)).toBeLessThan(1e-6)
      expect(s).toBe(PRINT.scale)
      // And a hair into the flight it is still there (continuous start).
      const b = newPose()
      ringPlacement(row(only(k, 1e-9)), k, b)
      expect(b.position.distanceTo(free.position)).toBeLessThan(1e-6)
      expect(b.quaternion.angleTo(free.quaternion)).toBeLessThan(1e-6)
    }
  })

  it('seats ring k exactly on slotPose(k) at full size with flight 1', () => {
    const r = row([1, 1, 1, 1])
    for (let k = 0; k < RING_COUNT; k++) {
      const o = newPose()
      const s = ringPlacement(r, k, o)
      const slot = slotPose(k)
      expect(o.position.distanceTo(slot.position)).toBe(0)
      expect(o.quaternion.angleTo(slot.quaternion)).toBeLessThan(1e-6)
      expect(s).toBe(1)
    }
  })

  it('moves each ring by its own flight only', () => {
    const r = row([0, 0.5, 0, 1])
    const o = newPose()
    ringPlacement(r, 0, o)
    expect(o.position.distanceTo(ringPose(r, 0, newPose()).position)).toBe(0)
    ringPlacement(r, 3, o)
    expect(o.position.distanceTo(slotPose(3).position)).toBe(0)
    const s = ringPlacement(r, 1, o)
    expect(s).toBeGreaterThan(PRINT.scale)
    expect(s).toBeLessThan(1)
  })

  it('reaches the staging point outside the slot (on the sprue axis, turned, full size), then slides straight along that axis', () => {
    for (let k = 0; k < RING_COUNT; k++) {
      const slot = slotPose(k)
      const stage = axis(k).multiplyScalar(ASSEMBLY.stage[k]).add(slot.position)
      const o = newPose()
      const s = ringPlacement(row(only(k, ASSEMBLY.curve)), k, o)
      expect(o.position.distanceTo(stage)).toBeLessThan(1e-9)
      expect(o.quaternion.angleTo(slot.quaternion)).toBeLessThan(1e-6)
      expect(s).toBe(1)
      // Staged outside: farther from the trunk axis and higher than the seat.
      expect(Math.hypot(stage.x, stage.z)).toBeGreaterThan(Math.hypot(slot.position.x, slot.position.z))
      expect(stage.y).toBeGreaterThan(slot.position.y)
      for (let t = ASSEMBLY.curve; t <= 1; t += 0.01) {
        ringPlacement(row(only(k, t)), k, o)
        const d = o.position.clone().sub(slot.position)
        // On the sprue axis line, between the staging point and the seat, in the slot orientation.
        expect(d.clone().cross(axis(k)).length()).toBeLessThan(1e-9)
        expect(d.dot(axis(k))).toBeGreaterThanOrEqual(-1e-9)
        expect(d.dot(axis(k))).toBeLessThanOrEqual(ASSEMBLY.stage[k] + 1e-9)
        expect(o.quaternion.angleTo(slot.quaternion)).toBeLessThan(1e-6)
      }
    }
  })

  it('moves and turns continuously (no jump anywhere, also where the curve meets the slide)', () => {
    const N = 2000
    for (let k = 0; k < RING_COUNT; k++) {
      const a = newPose()
      const b = newPose()
      ringPlacement(row(only(k, 0)), k, a)
      let maxStep = 0
      let maxTurn = 0
      for (let i = 1; i <= N; i++) {
        ringPlacement(row(only(k, i / N)), k, b)
        maxStep = Math.max(maxStep, a.position.distanceTo(b.position))
        maxTurn = Math.max(maxTurn, a.quaternion.angleTo(b.quaternion))
        a.position.copy(b.position)
        a.quaternion.copy(b.quaternion)
      }
      expect(maxStep, `ring ${k}`).toBeLessThan(0.01)
      expect(maxTurn, `ring ${k}`).toBeLessThan(0.01)
    }
  })

  it('enters the slide at the speed of the curve (no kink in the motion)', () => {
    const h = 1e-5
    const c = ASSEMBLY.curve
    const o = newPose()
    for (let k = 0; k < RING_COUNT; k++) {
      const at = (t: number) => (ringPlacement(row(only(k, t)), k, o), o.position.clone())
      const before = at(c - h).sub(at(c - 2 * h)).divideScalar(h)
      const after = at(c + 2 * h).sub(at(c + h)).divideScalar(h)
      expect(before.distanceTo(after) / after.length(), `ring ${k}`).toBeLessThan(1e-3)
    }
  })

  it('grows from the print size to full size, smoothly and monotonically, by the staging point', () => {
    const h = PRINT.scale
    expect(flightScale(h, 0)).toBe(h)
    expect(flightScale(h, ASSEMBLY.curve)).toBe(1)
    expect(flightScale(h, 1)).toBe(1)
    expect(flightScale(h, ASSEMBLY.curve / 2)).toBeCloseTo((h + 1) / 2, 12)
    let prev = 0
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const s = ringPlacement(row(only(0, t)), 0, newPose())
      expect(s).toBeCloseTo(flightScale(h, t), 12)
      expect(s).toBeGreaterThanOrEqual(prev)
      prev = s
    }
    // Act 1 (scale 1, no flight): unchanged.
    expect(flightScale(1, 0)).toBe(1)
  })
})
