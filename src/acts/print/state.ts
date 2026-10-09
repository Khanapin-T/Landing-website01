import { PRINT, printPose } from '../../config/print'

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
  /** World Y of the supports' print frame (the ring centre while printing; it stays where the print ended). */
  sup: number
  /** 0..1: the supports break off, fall and turn into points (during the flip). */
  drop: number
}

export const PRINT_INITIAL: Readonly<PrintState> = { bed: 0, plate: PRINT.plate.parkedY, grow: 0, glow: 0, sup: printPose(0).ringY, drop: 0 }

export const print: PrintState = { ...PRINT_INITIAL }
