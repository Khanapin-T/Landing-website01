import { PRINT, RING_HALF } from './print'

const TAU = Math.PI * 2
const mod = (a: number, n: number) => ((a % n) + n) % n

/** Act 3 layout in world units (ring height = 1). The flask axis is world Y at x = z = 0. Tuned by test + eye. */
export const MOLD = {
  baseTopY: -1.4,
  base: { radius: 1.5, thickness: 0.2, coneRadius: 0.32, coneHeight: 0.22, dropOffset: -3.2 },
  flask: { innerRadius: 1.3, wall: 0.03, bottomY: -1.4, height: 3.8, dropHeight: 3.9 },
  investment: { bottomY: -1.4, topY: 2.3 },
  trunk: { radius: 0.08, bottomY: -1.18, topY: 2.1 },
  /** Strip of tape: `turns` full turns up the flask, `coverage` = band width in pitches (1.3 = 30% overlap). */
  tape: { turns: 4, coverage: 1.3, azimuth0: -Math.PI / 2 },
} as const

export interface TreeSlot {
  /** Height of the sprue tip on the trunk. */
  y: number
  /** Branch direction about world Y (radians, see the azimuth convention). */
  azimuth: number
  /** Ring tilt outward-up around its own Z (radians). */
  tilt: number
}

const deg = (d: number) => (d * Math.PI) / 180

/** Slot 0 is the hero ring. Initial values; the fit test in slots.test.ts is the contract. */
export const TREE_SLOTS: readonly TreeSlot[] = [
  { y: -0.45, azimuth: 0, tilt: deg(32) },
  { y: -1.15, azimuth: deg(200), tilt: deg(33) },
  { y: 0.3, azimuth: deg(115), tilt: deg(33) },
  { y: 0.85, azimuth: deg(280), tilt: deg(33) },
]

/** Camera dolly targets (y, z). The start value is CAM_INITIAL in store.ts. */
export const CAM = {
  tree: { y: 0.35, z: 9.2 },
  vacuum: { y: 0.8, z: 6.4 },
} as const

/**
 * The strip starts one turn below the flask bottom (u = -1, so the first turn covers the bottom edge) and runs one
 * turn past the top (u = turns + 1), so the whole surface is covered. Length in turns.
 */
export const TAPE_LENGTH = MOLD.tape.turns + 2

/**
 * Number of tape layers (0, 1 or 2) covering a flask surface point, given the point's height fraction `h` (0 bottom,
 * 1 top), its object-space azimuth `az` and the wrap progress `p` (0..1). The strip's helix: height fraction
 * (u) / turns, azimuth azimuth0 + 2 PI u, for u from -1 to turns + 1. The shader mirrors this function.
 */
export function tapeLayers(h: number, az: number, p: number): number {
  const { turns, coverage, azimuth0 } = MOLD.tape
  const f = mod((az - azimuth0) / TAU, 1)
  const c = h * turns - f
  const front = -1 + p * TAPE_LENGTH
  let layers = 0
  for (let k = Math.max(-1, Math.ceil(c - coverage / 2)); k <= Math.floor(c + coverage / 2); k++) {
    if (k + f <= front) layers++
  }
  return layers
}

/**
 * Flask rotation about Y while the tape is laid, so the point where the strip meets the flask stays at the same
 * world azimuth (facing the camera). TAPE_LENGTH is an integer: the flask ends at rest at p = 0 and p = 1.
 */
export function tapeSpin(p: number): number {
  return -TAU * TAPE_LENGTH * p
}

/** World Y of the investment surface (fill 0..1). */
export function investmentLevelY(fill: number): number {
  return MOLD.investment.bottomY + fill * (MOLD.investment.topY - MOLD.investment.bottomY)
}

// Referenced so the geometry contract with the print config is explicit.
export const SPRUE_TIP_OFFSET = RING_HALF + PRINT.sprue.length
