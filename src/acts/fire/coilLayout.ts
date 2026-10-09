import { COILS } from '../../config/fire'
import { FOCUS_X } from '../../scene/cameraMath'

export interface CoilView {
  aspect: number
  fovDeg: number
  /** Camera Z (the camera looks level at x = 0 along -Z; the focus view offset puts the axis at `focus` of the width). */
  camZ: number
  focus?: number
}

/** No floor spring (author, 2026-10-09): the flask stands open at the bottom of the frame. */
export type CoilSide = 'left' | 'right' | 'top'

/**
 * Placement of one wall's spring. The spring is modeled in a local frame (x along the runs, y across them, z out of the
 * wall, see helix.ts). World matrix = translate(position) * Rz(rotationZ) * Ry(90 deg): Ry turns the local x axis to
 * world -Z (the runs go away from the camera) and the local z axis to world +X; Rz then turns that onto the right
 * wall (pi) or the ceiling (-pi/2, the runs are spread across the width). All right-handed.
 */
export interface CoilWall {
  side: CoilSide
  /** World position of the local origin: on the wall at the near plane, centered across the runs. */
  position: [number, number, number]
  rotationZ: number
  /** Distance between neighbouring runs of this wall's spring. */
  spacing: number
}

export interface CoilLayout {
  /** Depth of the runs (zNear - zFar). */
  length: number
  /** Run spacing on the side walls (across the height) and on the ceiling (across the width). */
  sideSpacing: number
  spanSpacing: number
  walls: CoilWall[]
}

/**
 * The three springs (left, right, ceiling) of the furnace tunnel in world space. The walls are fixed in world space, so the runs converge
 * toward the flask axis on screen. At the near plane the box reaches `COILS.edge` of the way from the axis to each
 * screen edge (left and right measured separately because the focus offset puts the axis at 58% of the width); the
 * springs sit one coil radius inside their wall.
 */
export function coilLayout({ aspect, fovDeg, camZ, focus = FOCUS_X }: CoilView): CoilLayout {
  const halfH = (camZ - COILS.zNear) * Math.tan((fovDeg * Math.PI) / 360)
  const fullW = 2 * halfH * aspect
  const wallLeft = COILS.edge * focus * fullW
  const wallRight = COILS.edge * (1 - focus) * fullW
  const wallY = COILS.edge * halfH
  const cy = COILS.centerY
  const midX = (wallRight - wallLeft) / 2
  const inset = COILS.coilRadius + COILS.tubeRadius + 0.05
  const sideSpacing = COILS.spacing * wallY
  const spanSpacing = COILS.spacing * ((wallLeft + wallRight) / 2)
  const z = COILS.zNear
  return {
    length: COILS.zNear - COILS.zFar,
    sideSpacing,
    spanSpacing,
    walls: [
      { side: 'left', position: [-wallLeft + inset, cy, z], rotationZ: 0, spacing: sideSpacing },
      { side: 'right', position: [wallRight - inset, cy, z], rotationZ: Math.PI, spacing: sideSpacing },
      { side: 'top', position: [midX, cy + wallY - inset, z], rotationZ: -Math.PI / 2, spacing: spanSpacing },
    ],
  }
}
