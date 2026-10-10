/** Scroll-scrubbed Act 3 values, written by the master timeline and read in useFrame. */
export interface MoldState {
  /** Rubber base: 0 = below the frame, 1 = in place. */
  base: number
  /**
   * Wax trunk arrival 0..1: 0 = below the frame (standing on the base at MOLD.base.dropOffset), 1 = in place. Rises
   * with the base (same tween), but stays in the flask when the base drops away.
   */
  trunk: number
  /**
   * UNUSED since the four-ring print (2026-10-10: the printed rings fly to the tree, no clones pop in). Kept only
   * because src/acts/birth/timeline.test.ts still resets it; remove together with that line.
   */
  clones: [number, number, number]
  /** Flask: 0 = high above its seat, 1 = seated. */
  flask: number
  /** Tape wrap progress 0..1 (also drives the flask spin). */
  tape: number
  /** Investment level 0..1. */
  fill: number
  /** Vacuum boil strength 0..1. */
  boil: number
  /** Rest timer 0..1 (00:00 to 15:00): the investment thickens, tape still on, before the tape comes off. */
  rest: number
}

export const MOLD_INITIAL: Readonly<MoldState> = { base: 0, trunk: 0, clones: [0, 0, 0], flask: 0, tape: 0, fill: 0, boil: 0, rest: 0 }

export const mold: MoldState = { ...MOLD_INITIAL, clones: [0, 0, 0] }
