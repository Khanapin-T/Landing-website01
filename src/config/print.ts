/** Half the hero ring height in world units (RING_HEIGHT / 2 in src/scene/ring/useRingGeometry.ts). */
export const RING_HALF = 0.5

/** Cure-plane value that disables the print clip (far below the frame). */
export const CURE_OFF = -1000

/** Castable resin: translucent pale green (scene light, not a UI accent). Tuned in integration. */
export const RESIN_COLOR = '#a8e3bd'

/** Act 2 layout in world units (ring height = 1). Shared by the ring, the act props and Act 1's particle targets. */
export const PRINT = {
  /** Vat floor = cure plane: the printed part only exists above it. */
  cureY: -0.82,
  /** Resin surface in the vat; Act 1 points land here. */
  resinSurfaceY: -0.75,
  /** Open tray, outer size; its inner floor sits at cureY. */
  vat: { width: 1.8, depth: 0.95, wall: 0.025, height: 0.16 },
  /** How far below its place the vat waits before it rises in. */
  vatHiddenOffset: -0.7,
  /** One sprue on the shank bottom (the top while printing upside down). */
  sprue: { length: 0.25, radius: 0.045 },
  /** Build plate; plate Y values are its bottom face. parkedY is out of frame above. */
  plate: { width: 1.3, depth: 0.8, thickness: 0.07, parkedY: 1.9 },
} as const

/**
 * Plate and ring positions while printing (g = 0..1). The ring hangs upside down under the plate on the sprue,
 * so the part's top (sprue top) touches the plate and its newest layer sits on the cure plane.
 */
export function printPose(g: number): { plateY: number; ringY: number } {
  const plateY = PRINT.cureY + g * (2 * RING_HALF + PRINT.sprue.length)
  return { plateY, ringY: plateY - PRINT.sprue.length - RING_HALF }
}
