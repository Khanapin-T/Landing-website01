/** Scroll-scrubbed Act 4 values, written by the master timeline and read in useFrame. */
export interface FireState {
  /** Coil rows fade-in 0..1, nearest row first. */
  coils: [number, number, number]
}

export const FIRE_INITIAL: Readonly<FireState> = { coils: [0, 0, 0] }

export const fire: FireState = { coils: [0, 0, 0] }
