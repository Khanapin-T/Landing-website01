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
  /** World Y of the supports' print frame (set at the ring switch; the ring centre while printing; it stays where the print ended). */
  sup: number
  /** 0..1: the supports crumble into a short puff of points (at 100%, before the ring leaves the plate). */
  drop: number
}

export const PRINT_INITIAL: Readonly<PrintState> = { bed: 0, plate: PRINT.plate.parkedY, grow: 0, glow: 0, sup: 0, drop: 0 }

export const print: PrintState = { ...PRINT_INITIAL }
