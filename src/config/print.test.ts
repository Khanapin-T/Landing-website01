import { describe, expect, it } from 'vitest'
import { CAM_INITIAL } from '../story/store'
import { CURE_OFF, PRINT, RING_HALF, printPose, railOpacity } from './print'

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

describe('printer', () => {
  // Act 2 camera: CAM_INITIAL, level, fov 30, 16:9.
  const frameHalfH = CAM_INITIAL.z * Math.tan((30 * Math.PI) / 360)
  const frameTop = CAM_INITIAL.look + frameHalfH

  it('has a build plate about 60% of the frame width (author, after the reference printer photos)', () => {
    // Measured at its front edge, the part nearest the camera.
    const frameW = 2 * (CAM_INITIAL.z - PRINT.plate.depth / 2) * Math.tan((30 * Math.PI) / 360) * (16 / 9)
    expect(PRINT.plate.width / frameW).toBeGreaterThan(0.57)
    expect(PRINT.plate.width / frameW).toBeLessThan(0.63)
  })

  it('parks the plate fully out of the frame', () => {
    expect(PRINT.plate.parkedY).toBeGreaterThan(frameTop)
  })

  it('runs the rails from under the vat to above the frame, behind the plate', () => {
    expect(PRINT.rails.bottomY).toBeLessThan(PRINT.cureY)
    expect(PRINT.rails.topY).toBeGreaterThan(frameTop)
    expect(PRINT.rails.z).toBeLessThan(-PRINT.plate.depth / 2)
  })

  it('fades the rails in as the plate comes into the frame and out as it leaves', () => {
    expect(railOpacity(PRINT.plate.parkedY)).toBe(0)
    expect(railOpacity(PRINT.rails.fullAtY)).toBe(1)
    expect(railOpacity(printPose(0).plateY)).toBe(1)
    const mid = railOpacity((PRINT.plate.parkedY + PRINT.rails.fullAtY) / 2)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(PRINT.rails.fullAtY).toBeGreaterThanOrEqual(frameTop)
  })
})
