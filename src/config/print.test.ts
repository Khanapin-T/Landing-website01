import { describe, expect, it } from 'vitest'
import { CAM_INITIAL } from '../story/store'
import { FOCUS_X } from '../scene/cameraMath'
import { RING_HALF_EXTENTS } from '../scene/tree/slots'
import { CURE_OFF, LIFT_CAM, PRINT, PRINT_SPOTS, RING_COUNT, RING_HALF, gridX, gridZ, printPose, ringPrintX, ringPrintZ, railOpacity, railSpan } from './print'

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

describe('four-ring print grid (2 x 2)', () => {
  const S = PRINT.scale
  const { spanX, spanZ, jitter, baseRadius, radius } = PRINT.supports
  const foot = Math.max(baseRadius, 2 * radius * 1.6)
  // Widest reach of a ring with its supports, ring-local: the ring's bbox, or the outermost support's foot.
  const halfX = Math.max(RING_HALF_EXTENTS.x, spanX + jitter / 2 + foot) * S
  const halfZ = Math.max(RING_HALF_EXTENTS.z, spanZ + jitter / 2 + foot) * S
  const spots = Array.from({ length: RING_COUNT }, (_, k) => ({ k, x: ringPrintX(k), z: ringPrintZ(k) }))

  it('prints four rings in a true 2 x 2 grid: two rows along z, two columns along x, the back two directly behind the front two', () => {
    expect(RING_COUNT).toBe(4)
    expect(PRINT_SPOTS.length).toBe(RING_COUNT)
    const front = spots.filter((s) => s.z > 0)
    const back = spots.filter((s) => s.z < 0)
    expect(front.map((s) => s.k).sort()).toEqual([0, 1])
    expect(back.map((s) => s.k).sort()).toEqual([2, 3])
    for (const row of [front, back]) {
      expect(row[0].z).toBe(row[1].z)
      expect(row[0].x + row[1].x).toBeCloseTo(0, 12)
    }
    expect(front[0].z + back[0].z).toBeCloseTo(0, 12)
    expect(spots.filter((s) => s.x < 0).map((s) => s.k).sort()).toEqual([0, 3])
    expect(spots.filter((s) => s.x > 0).map((s) => s.k).sort()).toEqual([1, 2])
    // Same columns in both rows (not staggered).
    expect(ringPrintX(3)).toBe(ringPrintX(0))
    expect(ringPrintX(2)).toBe(ringPrintX(1))
  })

  it('fits all four rings with their supports on the plate and over the resin bed with a margin', () => {
    for (const s of spots) {
      expect(Math.abs(s.x) + halfX).toBeLessThanOrEqual(PRINT.plate.width / 2 - 0.03)
      expect(Math.abs(s.z) + halfZ).toBeLessThanOrEqual(PRINT.plate.depth / 2 - 0.03)
      expect(Math.abs(s.x) + halfX).toBeLessThanOrEqual(PRINT.pool.halfWidth)
      expect(Math.abs(s.z) + halfZ).toBeLessThanOrEqual(PRINT.pool.halfDepth)
    }
  })

  it('keeps the two rows apart in depth and the two columns apart in x (ring plus supports)', () => {
    expect(2 * PRINT.grid.rowZ - 2 * halfZ).toBeGreaterThan(0.2)
    expect(2 * PRINT.grid.columnX - 2 * halfX).toBeGreaterThan(0.2)
  })

  it('places the rings by spread: all at the origin at 0 (Act 1), the grid at 1, then front out to frontX, back to backX', () => {
    const { liftSpread, frontX, backX, columnX } = PRINT.grid
    for (const s of spots) {
      expect(gridX(s.k, 0)).toBeCloseTo(0, 12)
      expect(gridZ(s.k, 0)).toBeCloseTo(0, 12)
      expect(gridX(s.k, 0.5)).toBeCloseTo(s.x / 2, 12)
      expect(gridX(s.k, 1)).toBe(s.x)
      expect(gridZ(s.k, 1)).toBe(s.z)
      expect(gridZ(s.k, liftSpread)).toBe(s.z)
      const x = gridX(s.k, liftSpread)
      expect(Math.sign(x)).toBe(Math.sign(s.x))
      const to = s.z > 0 ? frontX : backX
      expect(Math.abs(x)).toBeCloseTo(to, 12)
      expect(Math.abs(gridX(s.k, (1 + liftSpread) / 2))).toBeCloseTo((columnX + to) / 2, 12)
      expect(gridX(s.k, liftSpread + 1)).toBe(x)
    }
    // Front outer, back inner, never inward.
    expect(frontX).toBeGreaterThan(backX)
    expect(backX).toBeGreaterThanOrEqual(columnX)
  })

  // The end of Act 2: full-size rings (scale 1, the size they have on the tree) seen from LIFT_CAM at 1920 x 1080.
  const tan = Math.tan((30 * Math.PI) / 360)
  const endLane = (s: { k: number; z: number }) => {
    // Screen fraction across the width of each ring's turned box (yaw 0.6: about 1.02 wide, 0.5 deep at most).
    const hx = RING_HALF_EXTENTS.x * Math.cos(0.6) + RING_HALF_EXTENTS.z * Math.sin(0.6)
    const hz = RING_HALF_EXTENTS.x * Math.sin(0.6) + RING_HALF_EXTENTS.z * Math.cos(0.6)
    const x = gridX(s.k, PRINT.grid.liftSpread)
    const fs: number[] = []
    for (const dx of [-hx, hx])
      for (const dz of [-hz, hz]) {
        const d = LIFT_CAM.z - (s.z + dz)
        fs.push(FOCUS_X + (x + dx) / (2 * d * tan * (16 / 9)))
      }
    return { lo: Math.min(...fs), hi: Math.max(...fs) }
  }

  it('shows all four full-size rings side by side at the end of the act (front outer, back inner), overlapping at most slightly', () => {
    const lanes = spots.map(endLane).sort((a, b) => a.lo - b.lo)
    // Neighbours (front vs back, different depths) may overlap by at most 3% of the width (about 60 px of a 270 px ring).
    for (let i = 1; i < lanes.length; i++) expect(lanes[i].lo - lanes[i - 1].hi).toBeGreaterThan(-0.03)
  })

  it('keeps every full-size ring right of the copy column (560 px at 1920) and inside the frame at the end of the act', () => {
    for (const s of spots) {
      const l = endLane(s)
      expect(l.lo).toBeGreaterThan(560 / 1920)
      expect(l.hi).toBeLessThan(0.95)
    }
    // And vertically: the ring with its sprue (y -0.75 .. 0.5) inside the frame.
    const halfH = (LIFT_CAM.z - PRINT.grid.rowZ - 0.5) * tan
    expect(LIFT_CAM.look - halfH).toBeLessThan(-0.75 - 0.1)
    expect(LIFT_CAM.look + halfH).toBeGreaterThan(0.5 + 0.1)
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

  it('parks the plate fully out of the frame, and lifts it out of the wider end-of-act frame (LIFT_CAM)', () => {
    expect(PRINT.plate.parkedY).toBeGreaterThan(frameTop)
    // LIFT_CAM's frame top at the plate's front edge (the nearest part).
    const liftTop = LIFT_CAM.look + (LIFT_CAM.z - PRINT.plate.depth / 2) * Math.tan((30 * Math.PI) / 360)
    expect(PRINT.plate.liftY).toBeGreaterThan(liftTop + 0.1)
    expect(PRINT.plate.liftY).toBeGreaterThan(PRINT.plate.parkedY)
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
