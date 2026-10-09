import { describe, expect, it } from 'vitest'
import { CAM_INITIAL } from '../story/store'
import { CURE_OFF, PRINT, RING_HALF, printPose, railOpacity, railSpan } from './print'

describe('print layout', () => {
  // The ring prints at PRINT.scale (author: 40% smaller while printing).
  const S = PRINT.scale
  const part = (RING_HALF + PRINT.sprue.length) * S

  it('prints the ring 40% smaller', () => {
    expect(S).toBeCloseTo(0.6, 9)
  })

  it('starts with the plate on the vat floor and the whole part below the cure plane', () => {
    const p = printPose(0)
    expect(p.plateY).toBeCloseTo(PRINT.cureY)
    // Upside down: the sprue is on top, its top touches the plate; the ring's lowest point is below the plate.
    expect(p.ringY + part).toBeCloseTo(p.plateY)
    expect(p.ringY + part).toBeLessThanOrEqual(PRINT.cureY + 1e-9)
  })

  it('ends with the whole part printed above the cure plane', () => {
    const p = printPose(1)
    expect(p.ringY - RING_HALF * S).toBeCloseTo(PRINT.cureY)
    expect(p.plateY).toBeCloseTo(PRINT.cureY + (2 * RING_HALF + PRINT.sprue.length) * S)
  })

  it('keeps plate and part rigidly attached in between (linear)', () => {
    for (const g of [0.1, 0.37, 0.5, 0.9]) {
      const p = printPose(g)
      expect(p.plateY - p.ringY).toBeCloseTo(part)
      expect(p.plateY).toBeCloseTo(PRINT.cureY + g * (2 * RING_HALF + PRINT.sprue.length) * S)
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

  it('runs the rails from the plate top up out of the frame, behind the plate, never below it', () => {
    for (const plateY of [printPose(0).plateY, printPose(0.5).plateY, printPose(1).plateY]) {
      const s = railSpan(plateY)
      expect(s.bottom).toBeCloseTo(plateY + PRINT.plate.thickness, 9)
      expect(s.bottom + s.height).toBeGreaterThan(frameTop)
    }
    expect(railSpan(10).height).toBe(0)
    expect(PRINT.rails.z).toBeLessThan(-PRINT.plate.depth / 2)
  })

  it('pools the resin under the whole plate (the plate footprint, not a small round pool)', () => {
    expect(PRINT.pool.halfWidth * 2).toBeCloseTo(PRINT.plate.width, 9)
    expect(PRINT.pool.halfDepth * 2).toBeCloseTo(PRINT.plate.depth, 9)
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
