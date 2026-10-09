import { COILS } from '../../config/fire'
import { FOCUS_X } from '../../scene/cameraMath'

export interface CoilView {
  aspect: number
  fovDeg: number
  /** Camera Z (the camera looks level at x = 0 along -Z; the focus view offset puts the axis at `focus` of the width). */
  camZ: number
  focus?: number
}

/** Only the side walls carry heating elements (author, 2026-10-09): ceiling and floor are bare. */
export type CoilSide = 'left' | 'right'

/**
 * Placement of one wall's hairpins. A hairpin is modeled in a local frame (x along the runs, y across them, z out of the
 * wall, see helix.ts). World matrix = translate(position + hairpin offset) * Rz(rotationZ) * Ry(90 deg): Ry turns the
 * local x axis to world -Z (the runs go away from the camera) and the local z axis to world +X; Rz then turns that onto
 * the right wall (pi). All right-handed. A hairpin is symmetric across its runs, so the turn about Z does not change it.
 */
export interface CoilWall {
  side: CoilSide
  /** World position of the wall's local origin: on the wall at the near plane, at the vertical center of the stack. */
  position: [number, number, number]
  rotationZ: number
}

export interface CoilLayout {
  /** Depth of the runs (zNear - zFar). */
  length: number
  /** Distance between the two runs of one hairpin. */
  hairpinHeight: number
  /** World Y offsets of the hairpin centers from the wall's `position[1]`, tier 0 (the top hairpin) first. */
  hairpinY: number[]
  walls: CoilWall[]
}

/**
 * The two walls (left, right) of the furnace tunnel in world space, each with three stacked hairpins. The walls are
 * fixed in world space, so the runs converge toward the flask axis on screen. At the near plane the box reaches
 * `COILS.edge` of the way from the axis to each screen edge (left and right measured separately because the focus
 * offset puts the axis at 58% of the width); the elements sit one coil radius inside their wall.
 */
export function coilLayout({ aspect, fovDeg, camZ, focus = FOCUS_X }: CoilView): CoilLayout {
  const halfH = (camZ - COILS.zNear) * Math.tan((fovDeg * Math.PI) / 360)
  const fullW = 2 * halfH * aspect
  const wallLeft = COILS.edge * focus * fullW
  const wallRight = COILS.edge * (1 - focus) * fullW
  const wallY = COILS.edge * halfH
  const cy = COILS.centerY
  const inset = COILS.coilRadius + COILS.tubeRadius + 0.05
  const hairpinHeight = COILS.hairpin * 2 * wallY
  const pitchY = hairpinHeight + COILS.hairpinGap * 2 * wallY
  const z = COILS.zNear
  return {
    length: COILS.zNear - COILS.zFar,
    hairpinHeight,
    hairpinY: [pitchY, 0, -pitchY],
    walls: [
      { side: 'left', position: [-wallLeft + inset, cy, z], rotationZ: 0 },
      { side: 'right', position: [wallRight - inset, cy, z], rotationZ: Math.PI },
    ],
  }
}
