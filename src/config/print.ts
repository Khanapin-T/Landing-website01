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
  /** Build plate; plate Y values are its bottom face. parkedY is out of frame above. */
  plate: { width: 1.0, depth: 0.62, thickness: 0.055, parkedY: 1.9 },
} as const

/**
 * Plate and ring positions while printing (g = 0..1). The ring hangs upside down under the plate on the sprue,
 * so the part's top (sprue top) touches the plate and its newest layer sits on the cure plane.
 */
export function printPose(g: number): { plateY: number; ringY: number } {
  const plateY = PRINT.cureY + g * (2 * RING_HALF + PRINT.sprue.length)
  return { plateY, ringY: plateY - PRINT.sprue.length - RING_HALF }
}
