import { describe, expect, it } from 'vitest'
import { CURE_OFF, PRINT, RING_HALF, printPose } from './print'

describe('print layout', () => {
  it('starts with the plate on the vat floor and the whole part below the cure plane', () => {
    const p = printPose(0)
    expect(p.plateY).toBeCloseTo(PRINT.cureY)
    // Upside down: the sprue is on top, its top touches the plate; the ring's lowest point is below the plate.
    expect(p.ringY + RING_HALF + PRINT.sprue.length).toBeCloseTo(p.plateY)
    expect(p.ringY + RING_HALF + PRINT.sprue.length).toBeLessThanOrEqual(PRINT.cureY + 1e-9)
  })

  it('ends with the whole part printed above the cure plane', () => {
    const p = printPose(1)
    expect(p.ringY - RING_HALF).toBeCloseTo(PRINT.cureY)
    expect(p.plateY).toBeCloseTo(PRINT.cureY + 2 * RING_HALF + PRINT.sprue.length)
  })

  it('keeps plate and part rigidly attached in between (linear)', () => {
    for (const g of [0.1, 0.37, 0.5, 0.9]) {
      const p = printPose(g)
      expect(p.plateY - p.ringY).toBeCloseTo(RING_HALF + PRINT.sprue.length)
      expect(p.plateY).toBeCloseTo(PRINT.cureY + g * (2 * RING_HALF + PRINT.sprue.length))
    }
  })

  it('uses an off value far below anything on screen', () => {
    expect(CURE_OFF).toBeLessThan(-100)
  })
})
