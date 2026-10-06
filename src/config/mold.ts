import { PRINT, RING_HALF } from './print'

const TAU = Math.PI * 2
const mod = (a: number, n: number) => ((a % n) + n) % n

/** `wall` = steel tube thickness: outer surface at innerRadius + wall. */
const FLASK = { innerRadius: 1.3, wall: 0.08, bottomY: -1.4, height: 4.2, dropHeight: 5.4 } as const
/** The investment fills the flask up to this far under its top rim. */
const INVESTMENT_GAP = 0.1

const BASE_HEIGHT = 0.55

/** Act 3 layout in world units (ring height = 1). The flask axis is world Y at x = z = 0. Tuned by test + eye. */
export const MOLD = {
  baseTopY: -1.4,
  /**
   * Tall black rubber cup under the flask flange (top face at baseTopY, the flange overhangs it a little).
   * `edge` = rounded outer edges, `lip` = raised ring around the flask foot, `dropOffset` = fully below the frame.
   */
  base: {
    radius: 1.85,
    height: BASE_HEIGHT,
    edge: 0.035,
    lip: { width: 0.05, height: 0.035 },
    coneRadius: 0.32,
    coneHeight: 0.22,
    dropOffset: -(BASE_HEIGHT + 3.2),
  },
  flask: FLASK,
  investment: { bottomY: FLASK.bottomY, topY: FLASK.bottomY + FLASK.height - INVESTMENT_GAP },
  /** The trunk is 40% of the flask height. */
  trunk: { radius: 0.08, bottomY: -1.18, topY: FLASK.bottomY + 0.4 * FLASK.height },
  /** The whole tree is turned about Y (45 deg: the four branches form an X seen from the camera). */
  yaw: Math.PI / 4,
  /** The investment stream: a vertical line at this radius and azimuth (far side, between two branches). */
  pour: { radius: 1.05, azimuth: Math.PI / 2 },
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
  /**
   * Ring rotation about its own sprue axis (ring-local Y), applied before the tilt. +PI/2 puts the ring plane through
   * the branch direction and the tangent, so the trunk axis never shows through the ring hole.
   */
  roll: number
}

const deg = (d: number) => (d * Math.PI) / 180

const UPPER_Y = MOLD.trunk.topY - 0.04
const LOWER_Y = MOLD.trunk.topY - 0.8
const TILT = deg(26)

/**
 * Slot 0 is the hero ring (front-left, toward the camera). Upper pair (0, 1): opposite branches, sprue tips at the top end
 * of the trunk. Lower pair (2, 3): turned 90 deg about the trunk and 0.76 below the upper tips: rings on neighbouring
 * branches interlock like chain links in plan view, and 0.8 below the trunk top is the smallest drop where the ring
 * shells clear each other by 0.06 (at 0.35..0.6 they touch).
 * Initial values; the fit test in slots.test.ts is the contract.
 */
export const TREE_SLOTS: readonly TreeSlot[] = [
  { y: UPPER_Y, azimuth: MOLD.yaw + deg(180), tilt: TILT, roll: Math.PI / 2 },
  { y: UPPER_Y, azimuth: MOLD.yaw, tilt: TILT, roll: Math.PI / 2 },
  { y: LOWER_Y, azimuth: MOLD.yaw + deg(270), tilt: TILT, roll: Math.PI / 2 },
  { y: LOWER_Y, azimuth: MOLD.yaw + deg(90), tilt: TILT, roll: Math.PI / 2 },
]

/**
 * Camera targets: position (y, z) and the Y of the point on the axis it looks at (look == y: level view).
 * The start value is CAM_INITIAL in store.ts. `tree` frames base + flask with a margin; `pour` is raised and
 * tilted down so the top opening of the flask (the pour and the boil) is visible. Tuned by eye.
 */
export const CAM = {
  tree: { y: 0.4, z: 13.4, look: 0.4 },
  pour: { y: 8.6, z: 12.4, look: 0.4 },
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
