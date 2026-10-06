import { describe, expect, it } from 'vitest'
import { COILS } from '../../config/fire'
import { MOLD } from '../../config/mold'
import { FOCUS_X } from '../../scene/cameraMath'
import { coilLayout } from './coilLayout'

const CAM_Z = 13.4
const FOV = 30
const tan = Math.tan((FOV * Math.PI) / 360)
const outer = COILS.coilRadius + COILS.tubeRadius

/** Screen fractions (0..1, y up from the bottom) of a world point for the Stage camera with the focus view offset. */
const fracX = (x: number, z: number, aspect: number) => FOCUS_X + x / (2 * (CAM_Z - z) * tan * aspect)
const fracY = (y: number, z: number) => 0.5 + (y - COILS.centerY) / (2 * (CAM_Z - z) * tan)

describe.each([16 / 9, 2.1, 1.6])('coilLayout at aspect %f', (aspect) => {
  const layout = coilLayout({ aspect, fovDeg: FOV, camZ: CAM_Z })
  const wall = (side: string) => layout.walls.find((w) => w.side === side)!

  it('has a spring on each of the four walls, started at the near plane', () => {
    expect(layout.walls.map((w) => w.side).sort()).toEqual(['bottom', 'left', 'right', 'top'])
    for (const w of layout.walls) expect(w.position[2]).toBe(COILS.zNear)
    expect(layout.length).toBe(COILS.zNear - COILS.zFar)
  })

  it('puts the near end of each wall close to the screen edge, inside the frame', () => {
    const z = COILS.zNear
    expect(fracX(wall('left').position[0] - outer, z, aspect)).toBeGreaterThan(0.01)
    expect(fracX(wall('left').position[0], z, aspect)).toBeCloseTo(FOCUS_X * (1 - COILS.edge), 1)
    expect(fracX(wall('right').position[0] + outer, z, aspect)).toBeLessThan(0.99)
    expect(fracX(wall('right').position[0], z, aspect)).toBeCloseTo(FOCUS_X + (1 - FOCUS_X) * COILS.edge, 1)
    expect(fracY(wall('top').position[1] + outer, z)).toBeLessThan(0.99)
    expect(fracY(wall('bottom').position[1] - outer, z)).toBeGreaterThan(0.01)
  })

  it('runs toward the middle: the far end of every spring is closer to the vanishing point than the near end', () => {
    const near = COILS.zNear
    const far = COILS.zFar
    const left = wall('left').position[0]
    expect(Math.abs(fracX(left, far, aspect) - FOCUS_X)).toBeLessThan(Math.abs(fracX(left, near, aspect) - FOCUS_X) * 0.6)
    const top = wall('top').position[1]
    expect(Math.abs(fracY(top, far) - 0.5)).toBeLessThan(Math.abs(fracY(top, near) - 0.5) * 0.6)
  })

  it('keeps every spring clear of the flask (tube, flange and foot)', () => {
    const flangeR = MOLD.flask.innerRadius + MOLD.flask.wall + 0.6
    const flaskTop = MOLD.flask.bottomY + MOLD.flask.height
    const flaskBottom = MOLD.flask.bottomY - MOLD.foot.height
    expect(-wall('left').position[0] - outer).toBeGreaterThan(flangeR)
    expect(wall('right').position[0] - outer).toBeGreaterThan(flangeR)
    expect(wall('bottom').position[1] + outer).toBeLessThan(flaskBottom)
    expect(wall('top').position[1] - outer).toBeGreaterThan(flaskTop)
    // The top and bottom springs stay clear in X too once their runs are spread across the width.
    expect(layout.spanSpacing).toBeGreaterThan(0)
    expect(layout.sideSpacing).toBeGreaterThan(0)
  })

  it('orients the walls: left and right are mirrored, top and bottom are turned a quarter', () => {
    expect(wall('left').rotationZ).toBe(0)
    expect(wall('right').rotationZ).toBeCloseTo(Math.PI, 9)
    expect(wall('top').rotationZ).toBeCloseTo(-Math.PI / 2, 9)
    expect(wall('bottom').rotationZ).toBeCloseTo(Math.PI / 2, 9)
    expect(wall('left').spacing).toBe(layout.sideSpacing)
    expect(wall('top').spacing).toBe(layout.spanSpacing)
  })
})
