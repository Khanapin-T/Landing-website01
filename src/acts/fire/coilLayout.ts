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
  /** Every coil lies horizontal (its axis along X). */
  center: [number, number, number]
}

export interface CoilLayout {
  /** Length of the left and right coils (they run from the screen edge toward the middle). */
  sideLength: number
  /** Length of the top and bottom coils (they span the width of the tunnel). */
  horizontalLength: number
  coils: CoilSpec[]
}

/**
 * The 12 coils of the furnace tunnel in world space, all horizontal. The walls are fixed in world space, so the three
 * rows (COILS.rowZ) converge toward the flask axis on screen. The nearest row reaches `COILS.edge` of the way from the
 * axis to each screen edge (left and right measured separately because the focus offset puts the axis at 58% of the
 * width). Top and bottom: one coil per row on the ceiling and the floor. Left and right: three tiers stacked in height
 * (row 0 on top, row 2 at the bottom), each running from the edge a short way toward the middle.
 */
export function coilLayout({ aspect, fovDeg, camZ, focus = FOCUS_X }: CoilView): CoilLayout {
  const halfH = (camZ - COILS.rowZ[0]) * Math.tan((fovDeg * Math.PI) / 360)
  const fullW = 2 * halfH * aspect
  const wallLeft = COILS.edge * focus * fullW
  const wallRight = COILS.edge * (1 - focus) * fullW
  const wallY = COILS.edge * halfH
  const cy = COILS.centerY
  const midX = (wallRight - wallLeft) / 2
  const sideLength = COILS.sideReach * (wallLeft + wallRight)
  const tier = COILS.tierSpacing * wallY
  const coils: CoilSpec[] = []
  COILS.rowZ.forEach((z, row) => {
    const y = cy + (1 - row) * tier
    coils.push({ row, side: 'left', center: [-wallLeft + sideLength / 2, y, z] })
    coils.push({ row, side: 'right', center: [wallRight - sideLength / 2, y, z] })
    coils.push({ row, side: 'top', center: [midX, cy + wallY, z] })
    coils.push({ row, side: 'bottom', center: [midX, cy - wallY, z] })
  })
  return {
    sideLength,
    // Stops two coil radii short of each end so the ends clear the side coils.
    horizontalLength: wallLeft + wallRight - 4 * COILS.coilRadius,
    coils,
  }
}
