import { COILS } from '../../config/fire'
import { FOCUS_X } from '../../scene/cameraMath'

export interface CoilView {
  aspect: number
  fovDeg: number
  /** Camera Z (the camera looks level at x = 0 along -Z; the focus view offset puts the axis at `focus` of the width). */
  camZ: number
  focus?: number
}

export type CoilSide = 'left' | 'right' | 'top' | 'bottom'

export interface CoilSpec {
  /** 0 = nearest row. */
  row: number
  side: CoilSide
  /** Axis of the helix: vertical coils on the side walls, horizontal ones on top and bottom. */
  axis: 'x' | 'y'
  center: [number, number, number]
}

export interface CoilLayout {
  verticalLength: number
  horizontalLength: number
  coils: CoilSpec[]
}

/**
 * The 12 coils of the furnace tunnel in world space. The walls are fixed in world space, so the three rows (COILS.rowZ)
 * converge toward the flask axis on screen. The nearest row reaches `COILS.edge` of the way from the axis to each
 * screen edge (left and right measured separately because the focus offset puts the axis at 58% of the width).
 */
export function coilLayout({ aspect, fovDeg, camZ, focus = FOCUS_X }: CoilView): CoilLayout {
  const halfH = (camZ - COILS.rowZ[0]) * Math.tan((fovDeg * Math.PI) / 360)
  const fullW = 2 * halfH * aspect
  const wallLeft = COILS.edge * focus * fullW
  const wallRight = COILS.edge * (1 - focus) * fullW
  const wallY = COILS.edge * halfH
  const cy = COILS.centerY
  const midX = (wallRight - wallLeft) / 2
  const coils: CoilSpec[] = []
  COILS.rowZ.forEach((z, row) => {
    coils.push({ row, side: 'left', axis: 'y', center: [-wallLeft, cy, z] })
    coils.push({ row, side: 'right', axis: 'y', center: [wallRight, cy, z] })
    coils.push({ row, side: 'top', axis: 'x', center: [midX, cy + wallY, z] })
    coils.push({ row, side: 'bottom', axis: 'x', center: [midX, cy - wallY, z] })
  })
  // Corners stay clear: each coil stops two coil radii short of the perpendicular walls.
  return {
    verticalLength: 2 * wallY - 4 * COILS.coilRadius,
    horizontalLength: wallLeft + wallRight - 4 * COILS.coilRadius,
    coils,
  }
}
