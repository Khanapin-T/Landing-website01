/** Scroll-scrubbed Act 5 values, written by the master timeline and read by the chamber, the gauge and the rest chip. */
export interface GoldState {
  /** 0 = vacuum chamber below the frame, 1 = slid up onto the flask (config/gold.ts CHAMBER). */
  chamber: number
  /** 0 = atmosphere, 1 = full vacuum (the gauge needle). */
  vacuum: number
  /** 0..1 of the rest timer (00:00 to 10:00). */
  rest: number
}

export const GOLD_INITIAL: Readonly<GoldState> = { chamber: 0, vacuum: 0, rest: 0 }

export const gold: GoldState = { ...GOLD_INITIAL }
