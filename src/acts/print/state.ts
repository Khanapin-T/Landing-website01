import { PRINT } from '../../config/print'

/** Scroll-scrubbed Act 2 values, written by the master timeline and read in useFrame / the HUD ticker. */
export interface PrintState {
  /** Resin bed light 0..1 (the soft glow under the pooled points). */
  bed: number
  /** World Y of the build plate's bottom face. */
  plate: number
  /** Print progress 0..1. */
  grow: number
  /** Cure light strength 0..1 (on while printing). */
  glow: number
}

export const PRINT_INITIAL: Readonly<PrintState> = { bed: 0, plate: PRINT.plate.parkedY, grow: 0, glow: 0 }

export const print: PrintState = { ...PRINT_INITIAL }
