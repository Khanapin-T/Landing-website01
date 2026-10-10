import { describe, expect, it } from 'vitest'
import { PRINT, RING_COUNT } from '../../config/print'
import { RING_INITIAL, type RingState } from '../../story/store'
import { slotPose } from '../tree/slots'
import { flightScale, ringPlacement } from './placement'
import { newPose, ringPose } from './pose'

/** The print row at the end of Act 2: four upright rings, small, spread out. */
const row = (flight: RingState['flight']): RingState => ({
  ...RING_INITIAL,
  fill: 1,
  resin: 1,
  sprue: 1,
  flip: Math.PI * 2,
  yaw: Math.PI * 2 + 0.6,
  y: 0,
  spread: PRINT.row.liftSpread,
  scale: PRINT.scale,
  flight,
})

describe('ring placement (print row -> tree slot)', () => {
  it('keeps every ring exactly in its row pose at the print size with flight 0', () => {
    const r = row([0, 0, 0, 0])
    for (let k = 0; k < RING_COUNT; k++) {
      const o = newPose()
      const s = ringPlacement(r, k, o)
      const free = ringPose(r, k, newPose())
      expect(o.position.distanceTo(free.position)).toBe(0)
      expect(o.quaternion.angleTo(free.quaternion)).toBeLessThan(1e-6)
      expect(s).toBe(PRINT.scale)
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
    const a = ringPose(r, 1, newPose()).position
    const b = slotPose(1).position
    expect(o.position.distanceTo(a.clone().lerp(b, 0.5))).toBeLessThan(1e-9)
  })

  it('grows from the print size to full size, smoothly and monotonically', () => {
    expect(flightScale(PRINT.scale, 0)).toBe(PRINT.scale)
    expect(flightScale(PRINT.scale, 1)).toBe(1)
    expect(flightScale(PRINT.scale, 0.5)).toBeCloseTo((PRINT.scale + 1) / 2, 12)
    let prev = 0
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const s = flightScale(PRINT.scale, t)
      expect(s).toBeGreaterThanOrEqual(prev)
      prev = s
    }
    // Act 1 (scale 1, no flight): unchanged.
    expect(flightScale(1, 0)).toBe(1)
  })
})
