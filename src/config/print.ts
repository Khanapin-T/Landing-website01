/** Half the hero ring height in world units (RING_HEIGHT / 2 in src/scene/ring/useRingGeometry.ts). */
export const RING_HALF = 0.5

/** Cure-plane value that disables the print clip (far below the frame). */
export const CURE_OFF = -1000

/** Castable resin: translucent pale green (scene light, not a UI accent). Tuned in integration. */
export const RESIN_COLOR = '#3fa772'

/**
 * Build plate (after the author's reference printer photos: a wide thin plate, about 60% of the frame width at its
 * front edge); plate Y values are its bottom face. parkedY is out of frame above (where it comes down from); liftY is
 * out of the wider end-of-act frame (LIFT_CAM), where it goes after the print.
 */
const PLATE = { width: 2.03, depth: 1.3, thickness: 0.06, parkedY: 1.9, liftY: 2.6 } as const

/** Act 2 layout in world units (ring height = 1). Shared by the ring, the act props and the resin stream particles. */
export const PRINT = {
  /** Cure plane (the vat floor): the printed part only exists above it. */
  cureY: -0.6,
  /**
   * The rings (with their sprues and supports) print at this size (author 2026-10-10: four rings, 20-30% smaller than
   * the old single print at 0.6); they grow back to full size while they turn over after the print.
   */
  scale: 0.45,
  /**
   * The four rings print in a true 2 x 2 grid (author 2026-10-10): two columns at x = +-columnX, a front row at
   * z = +rowZ and a back row at z = -rowZ (ring centres); from the level Act 2 camera the back two stand behind the
   * front two. After the print, while the plate lifts away, the rings turn over and grow to full size (they go onto
   * the tree at that size) and the camera pulls back a little (LIFT_CAM), the front two move out to x = +-frontX and
   * the back two to x = +-backX (story.ring.spread 1 -> liftSpread), so all four show side by side at the end of the
   * act (front outer, back inner), right of the copy column.
   */
  grid: { columnX: 0.35, rowZ: 0.5, frontX: 1.42, backX: 0.6, liftSpread: 2 },
  /**
   * The resin bed: Act 1's points pour into this flat layer just under the cure plane and feed the print from it.
   * A rectangle with the build plate's footprint (the author: not a small round pool).
   */
  pool: { y: -0.615, thickness: 0.03, halfWidth: PLATE.width / 2, halfDepth: PLATE.depth / 2 },
  /** One sprue on the shank bottom (the top while printing upside down). Printed with the ring; it stays after the supports crumble. */
  sprue: { length: 0.25, radius: 0.045 },
  plate: PLATE,
  /**
   * The two black vertical slots behind the plate the carriage rides in (fixed in the world, x = +-x, at depth z),
   * from the plate's top face (never below it: nothing behind the print) up out of the frame. They fade in while the
   * plate comes down from parkedY to fullAtY (the frame top) and out the same way.
   */
  rails: { x: 0.3, z: -1.15, width: 0.09, depth: 0.05, topY: 3.2, fullAtY: 1.3 },
  /**
   * Print supports: thin columns from the plate down onto the upside-down ring, on a jittered `gridX` x `gridZ` grid
   * over +-spanX, +-spanZ (ring-local), none within `sprueClear` of the sprue: every one up to maxLength (onto the shank
   * and shoulders under the plate), plus the longer ones in front of and behind the narrow shank (onto the wider part's
   * surfaces that face the plate), sideCount per side (author: 5-10 front and back). A column of `radius`, a cone `tip` of
   * `tipLength` down to `tipRadius` that bites `bite` into the surface, a `base` foot on the plate; the front and back
   * ones are twice as thick and taper to `radius` at the ring. At 100% (before the ring leaves the plate) they turn into
   * a short puff of points that drift `puff` units outward and back and fade. All sizes are ring-local (unscaled).
   */
  supports: {
    gridX: 17,
    gridZ: 8,
    spanX: 0.44,
    spanZ: 0.2,
    jitter: 0.02,
    sprueClear: 0.08,
    minLength: 0.03,
    maxLength: 0.42,
    /** Longer supports (past the narrow shank onto the wider part) only in front of and behind it: |z| >= sideMinZ, at most sideCount per side, spread across x. */
    sideMinZ: 0.1,
    sideCount: 8,
    radius: 0.007,
    tipRadius: 0.003,
    tipLength: 0.05,
    bite: 0.006,
    baseRadius: 0.026,
    baseHeight: 0.015,
    puff: 0.35,
  },
} as const

/** Rings printed together (one design, four copies on the plate; each takes its own tree slot in Act 3). */
export const RING_COUNT = 4

/**
 * Ring k's spot on the build plate (ring centre x, z), on the side of its tree slot in Act 3: the front row takes the
 * upper slots (ring 0 left, the hero ring, slot 0; ring 1 right, slot 1), the back row the lower slots (ring 3 left,
 * ring 2 right), which are filled first (src/config/assembly.ts).
 */
export const PRINT_SPOTS: readonly { readonly x: number; readonly z: number }[] = (() => {
  const { columnX, rowZ } = PRINT.grid
  return [
    { x: -columnX, z: rowZ },
    { x: columnX, z: rowZ },
    { x: columnX, z: -rowZ },
    { x: -columnX, z: -rowZ },
  ]
})()

/** Ring k's x on the build plate. */
export function ringPrintX(k: number): number {
  return PRINT_SPOTS[k].x
}

/** Ring k's z on the build plate. */
export function ringPrintZ(k: number): number {
  return PRINT_SPOTS[k].z
}

/**
 * Ring k's x for a grid `spread` (story.ring.spread): 0 = at the origin (Act 1, one ring), 1 = its grid spot; from 1
 * to liftSpread the front-row rings move out to +-frontX and the back-row rings to +-backX.
 */
export function gridX(k: number, spread: number): number {
  const { x, z } = PRINT_SPOTS[k]
  const { liftSpread, frontX, backX } = PRINT.grid
  const lift = Math.min(Math.max((spread - 1) / (liftSpread - 1), 0), 1)
  return x * Math.min(spread, 1) + Math.sign(x) * lift * ((z > 0 ? frontX : backX) - Math.abs(x))
}

/**
 * The camera at the end of Act 2 (and the start of Act 3): pulled back from CAM_INITIAL while the rings grow to full
 * size, so all four fit the frame. Same shape as story.cam (src/story/store.ts CamState).
 */
export const LIFT_CAM = { y: 0.15, z: 8.0, look: 0.15 } as const

/** Ring k's z for a grid `spread`: 0 = at the origin, its grid spot from 1 on (the rows stay where they printed). */
export function gridZ(k: number, spread: number): number {
  return PRINT_SPOTS[k].z * Math.min(spread, 1)
}

/** Opacity of the rails for a plate height: 0 while parked, 1 once the plate is in the frame. */
export function railOpacity(plateY: number): number {
  const { parkedY } = PRINT.plate
  const { fullAtY } = PRINT.rails
  const t = Math.min(Math.max((parkedY - plateY) / (parkedY - fullAtY), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Visible span of the rails for a plate height: from the plate's top face up to the rails' top (height 0 = none). */
export function railSpan(plateY: number): { bottom: number; height: number } {
  const bottom = plateY + PRINT.plate.thickness
  return { bottom, height: Math.max(PRINT.rails.topY - bottom, 0) }
}

/**
 * Plate and ring positions while printing (g = 0..1). The ring hangs upside down under the plate on the sprue, at
 * PRINT.scale, so the part's top (sprue top) touches the plate and its newest layer sits on the cure plane.
 */
export function printPose(g: number): { plateY: number; ringY: number } {
  const S = PRINT.scale
  const plateY = PRINT.cureY + g * (2 * RING_HALF + PRINT.sprue.length) * S
  return { plateY, ringY: plateY - (PRINT.sprue.length + RING_HALF) * S }
}
