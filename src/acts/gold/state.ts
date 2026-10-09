/** Scroll-scrubbed Act 5 values, written by the master timeline and read by the gauge and the rest chip. */
export interface GoldState {
  /** 0 = atmosphere, 1 = full vacuum (the gauge needle). */
  vacuum: number
  /** 0..1 of the rest timer (00:00 to 10:00). */
  rest: number
}

export const GOLD_INITIAL: Readonly<GoldState> = { vacuum: 0, rest: 0 }

export const gold: GoldState = { vacuum: 0, rest: 0 }
