/** Half the hero ring height in world units (RING_HEIGHT / 2 in src/scene/ring/useRingGeometry.ts). */
export const RING_HALF = 0.5

/** Cure-plane value that disables the print clip (far below the frame). */
export const CURE_OFF = -1000

/** Castable resin: translucent pale green (scene light, not a UI accent). Tuned in integration. */
export const RESIN_COLOR = '#3fa772'

/** Act 2 layout in world units (ring height = 1). Shared by the ring, the act props and the resin stream particles. */
export const PRINT = {
  /** Cure plane (the vat floor): the printed part only exists above it. */
  cureY: -0.6,
  /** The resin bed: Act 1's points pour into this flat layer just under the cure plane and feed the print from it. */
  pool: { y: -0.615, thickness: 0.03, halfWidth: 0.6, halfDepth: 0.34 },
  /** One sprue on the shank bottom (the top while printing upside down). */
  sprue: { length: 0.25, radius: 0.045 },
  /**
   * Build plate (after the author's reference printer photos: a wide thin plate, about 60% of the frame width at its front edge); plate Y values
   * are its bottom face. parkedY is out of frame above.
   */
  plate: { width: 2.03, depth: 1.3, thickness: 0.06, parkedY: 1.9 },
  /**
   * The two black vertical slots behind the plate the carriage rides in (fixed in the world, x = +-x, at depth z).
   * They fade in while the plate comes down from parkedY to fullAtY (the frame top) and out the same way.
   */
  rails: { x: 0.3, z: -1.15, width: 0.09, depth: 0.05, bottomY: -0.75, topY: 3.2, fullAtY: 1.3 },
} as const

/** Opacity of the rails for a plate height: 0 while parked, 1 once the plate is in the frame. */
export function railOpacity(plateY: number): number {
  const { parkedY } = PRINT.plate
  const { fullAtY } = PRINT.rails
  const t = Math.min(Math.max((parkedY - plateY) / (parkedY - fullAtY), 0), 1)
  return t * t * (3 - 2 * t)
}

/**
 * Plate and ring positions while printing (g = 0..1). The ring hangs upside down under the plate on the sprue,
 * so the part's top (sprue top) touches the plate and its newest layer sits on the cure plane.
 */
export function printPose(g: number): { plateY: number; ringY: number } {
  const plateY = PRINT.cureY + g * (2 * RING_HALF + PRINT.sprue.length)
  return { plateY, ringY: plateY - PRINT.sprue.length - RING_HALF }
}
