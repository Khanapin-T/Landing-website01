import { describe, expect, it } from 'vitest'
import { CAM_INITIAL } from '../story/store'
import { RING_HALF_EXTENTS } from '../scene/tree/slots'
import { CURE_OFF, PRINT, RING_COUNT, RING_HALF, printPose, printRingX, railOpacity, railSpan } from './print'

describe('print layout', () => {
  // The rings print at PRINT.scale (author 2026-10-10: 20-30% smaller than the old single print at 0.6).
  const S = PRINT.scale
  const part = (RING_HALF + PRINT.sprue.length) * S

  it('prints the rings 25% smaller than the old single print', () => {
    expect(S).toBeCloseTo(0.6 * 0.75, 9)
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

describe('four-ring print row', () => {
  const S = PRINT.scale
  const { spanX, jitter, baseRadius, radius } = PRINT.supports
  // Widest x reach of a ring with its supports, ring-local: the ring's bbox, or the outermost support's foot.
  const supportsHalfX = spanX + jitter / 2 + Math.max(baseRadius, 2 * radius * 1.6)
  const halfX = Math.max(RING_HALF_EXTENTS.x, supportsHalfX) * S

  it('prints four rings in a row centred on the plate, pitch apart', () => {
    expect(RING_COUNT).toBe(4)
    for (let k = 0; k < RING_COUNT; k++) {
      expect(printRingX(k)).toBeCloseTo((k - 1.5) * PRINT.row.pitch, 12)
      expect(printRingX(k) + printRingX(RING_COUNT - 1 - k)).toBeCloseTo(0, 12)
    }
    expect(PRINT.row.pitch).toBeCloseTo(0.5, 12)
  })

  it('fits all four rings with their supports on the plate with a margin', () => {
    const reach = printRingX(RING_COUNT - 1) + halfX
    expect(reach).toBeLessThanOrEqual(PRINT.plate.width / 2 - 0.03)
    // The resin bed under the plate covers every ring's cure front.
    expect(reach).toBeLessThanOrEqual(PRINT.pool.halfWidth)
  })

  it('keeps neighbours (ring plus supports) apart', () => {
    for (let k = 1; k < RING_COUNT; k++) {
      const gap = printRingX(k) - printRingX(k - 1) - 2 * halfX
      expect(gap).toBeGreaterThan(0.04)
    }
  })

  it('spreads the row wider (never narrower) as the rings leave the plate, still inside the frame', () => {
    expect(PRINT.row.liftSpread).toBeGreaterThan(1)
    // Act 2 camera at z = CAM_INITIAL.z, fov 30, 16:9: the frame half width at the rings' depth (z = 0).
    const frameHalfW = CAM_INITIAL.z * Math.tan((30 * Math.PI) / 360) * (16 / 9)
    expect(printRingX(RING_COUNT - 1) * PRINT.row.liftSpread + RING_HALF_EXTENTS.x * S).toBeLessThan(0.7 * frameHalfW)
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
