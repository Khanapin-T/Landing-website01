import { describe, expect, it } from 'vitest'
import { COILS } from '../../config/fire'
import { FOCUS_X } from '../../scene/cameraMath'
import { coilLayout } from './coilLayout'

const CAM_Z = 13.4
const FOV = 30
const tan = Math.tan((FOV * Math.PI) / 360)

/** Screen fractions (0..1, y up from the bottom) of a world point for the Stage camera with the focus view offset. */
const fracX = (x: number, z: number, aspect: number) => FOCUS_X + x / (2 * (CAM_Z - z) * tan * aspect)
const fracY = (y: number, z: number) => 0.5 + (y - COILS.centerY) / (2 * (CAM_Z - z) * tan)

describe.each([16 / 9, 2.1, 1.6])('coilLayout at aspect %f', (aspect) => {
  const layout = coilLayout({ aspect, fovDeg: FOV, camZ: CAM_Z })
  const at = (row: number, side: string) => layout.coils.find((c) => c.row === row && c.side === side)!
  /** World X of the outer end of a side coil (the end at the screen edge). */
  const outerX = (row: number, side: 'left' | 'right') =>
    at(row, side).center[0] + (side === 'left' ? -1 : 1) * (layout.sideLength / 2)

  it('has 3 coils on each of the four sides', () => {
    expect(layout.coils).toHaveLength(12)
    for (const side of ['left', 'right', 'top', 'bottom']) {
      expect(layout.coils.filter((c) => c.side === side)).toHaveLength(3)
    }
  })

  it('puts the outer ends of the nearest side row and the top and bottom coils close to the screen edges, inside the frame', () => {
    expect(fracX(outerX(0, 'left'), COILS.rowZ[0], aspect)).toBeCloseTo(FOCUS_X * (1 - COILS.edge), 6)
    expect(fracX(outerX(0, 'right'), COILS.rowZ[0], aspect)).toBeCloseTo(FOCUS_X + (1 - FOCUS_X) * COILS.edge, 6)
    const top = at(0, 'top').center
    const bottom = at(0, 'bottom').center
    expect(fracY(top[1], top[2])).toBeCloseTo(0.5 + 0.5 * COILS.edge, 6)
    expect(fracY(bottom[1], bottom[2])).toBeCloseTo(0.5 - 0.5 * COILS.edge, 6)
  })

  it('nests the rows toward the vanishing point (the farther the row, the smaller its frame)', () => {
    for (const side of ['left', 'right'] as const) {
      const d = [0, 1, 2].map((r) => Math.abs(fracX(outerX(r, side), at(r, side).center[2], aspect) - FOCUS_X))
      expect(d[1]).toBeLessThan(d[0])
      expect(d[2]).toBeLessThan(d[1])
    }
    for (const side of ['top', 'bottom'] as const) {
      const d = [0, 1, 2].map((r) => Math.abs(fracY(at(r, side).center[1], at(r, side).center[2]) - 0.5))
      expect(d[1]).toBeLessThan(d[0])
      expect(d[2]).toBeLessThan(d[1])
    }
  })

  it('stacks the side coils in three tiers (row 0 on top, row 2 at the bottom), the same on both sides', () => {
    for (const side of ['left', 'right'] as const) {
      const ys = [0, 1, 2].map((r) => at(r, side).center[1])
      expect(ys[0]).toBeGreaterThan(ys[1])
      expect(ys[1]).toBeGreaterThan(ys[2])
    }
    for (let r = 0; r < 3; r++) expect(at(r, 'left').center[1]).toBe(at(r, 'right').center[1])
  })

  it('keeps the side coils short and the top and bottom coils spanning the tunnel', () => {
    expect(layout.sideLength).toBeGreaterThan(0)
    expect(layout.horizontalLength).toBeGreaterThan(layout.sideLength * 2)
  })
})
