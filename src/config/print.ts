/** Half the hero ring height in world units (RING_HEIGHT / 2 in src/scene/ring/useRingGeometry.ts). */
export const RING_HALF = 0.5

/** Cure-plane value that disables the print clip (far below the frame). */
export const CURE_OFF = -1000

/** Castable resin: translucent pale green (scene light, not a UI accent). Tuned in integration. */
export const RESIN_COLOR = '#3fa772'

/**
 * Build plate (after the author's reference printer photos: a wide thin plate, about 60% of the frame width at its
 * front edge); plate Y values are its bottom face. parkedY is out of frame above.
 */
const PLATE = { width: 2.03, depth: 1.3, thickness: 0.06, parkedY: 1.9 } as const

/** Act 2 layout in world units (ring height = 1). Shared by the ring, the act props and the resin stream particles. */
export const PRINT = {
  /** Cure plane (the vat floor): the printed part only exists above it. */
  cureY: -0.6,
  /** The ring (and its sprue and supports) prints at this size (author: 40% smaller); act 3 grows it back on its way to the tree. */
  scale: 0.6,
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
