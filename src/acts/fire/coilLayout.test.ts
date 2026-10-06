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

  it('has 3 coils on each of the four sides', () => {
    expect(layout.coils).toHaveLength(12)
    for (const side of ['left', 'right', 'top', 'bottom']) {
      expect(layout.coils.filter((c) => c.side === side)).toHaveLength(3)
    }
  })

  it('puts the nearest row close to the screen edges and inside the frame', () => {
    const left = fracX(at(0, 'left').center[0], at(0, 'left').center[2], aspect)
    const right = fracX(at(0, 'right').center[0], at(0, 'right').center[2], aspect)
    const top = fracY(at(0, 'top').center[1], at(0, 'top').center[2])
    const bottom = fracY(at(0, 'bottom').center[1], at(0, 'bottom').center[2])
    expect(left).toBeCloseTo(FOCUS_X * (1 - COILS.edge), 6)
    expect(right).toBeCloseTo(FOCUS_X + (1 - FOCUS_X) * COILS.edge, 6)
    expect(top).toBeCloseTo(0.5 + 0.5 * COILS.edge, 6)
    expect(bottom).toBeCloseTo(0.5 - 0.5 * COILS.edge, 6)
  })

  it('nests the rows toward the vanishing point (the farther the row, the smaller its frame)', () => {
    for (const side of ['left', 'right'] as const) {
      const d = [0, 1, 2].map((r) => Math.abs(fracX(at(r, side).center[0], at(r, side).center[2], aspect) - FOCUS_X))
      expect(d[1]).toBeLessThan(d[0])
      expect(d[2]).toBeLessThan(d[1])
    }
    for (const side of ['top', 'bottom'] as const) {
      const d = [0, 1, 2].map((r) => Math.abs(fracY(at(r, side).center[1], at(r, side).center[2]) - 0.5))
      expect(d[1]).toBeLessThan(d[0])
      expect(d[2]).toBeLessThan(d[1])
    }
  })

  it('lays vertical coils on the side walls and horizontal ones on top and bottom', () => {
    for (const c of layout.coils) {
      expect(c.axis).toBe(c.side === 'left' || c.side === 'right' ? 'y' : 'x')
    }
    expect(layout.verticalLength).toBeGreaterThan(0)
    expect(layout.horizontalLength).toBeGreaterThan(layout.verticalLength)
  })
})
