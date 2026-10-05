import { PRINT } from '../../config/print'

/** Scroll-scrubbed Act 2 values, written by the master timeline and read in useFrame / the HUD ticker. */
export interface PrintState {
  /** Vat presence 0..1 (0 = below the frame). */
  vat: number
  /** World Y of the build plate's bottom face. */
  plate: number
  /** Print progress 0..1. */
  grow: number
  /** Cure light strength 0..1 (on while printing). */
  glow: number
}

export const PRINT_INITIAL: Readonly<PrintState> = { vat: 0, plate: PRINT.plate.parkedY, grow: 0, glow: 0 }

export const print: PrintState = { ...PRINT_INITIAL }
