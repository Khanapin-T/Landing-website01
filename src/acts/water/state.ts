/** Scroll-scrubbed Act 6 values, written by the master timeline and read by the water scene and the HUD. */
export interface WaterState {
  /** 0 = bucket below the frame, 1 = in place (config/water.ts bucketOffset). */
  bucket: number
  /** 0..1 boil strength of the surface (the hot flask goes in); it covers the part spread by immersion(dip). */
  boil: number
  /** 0 = clear water, 1 = milky white (the investment dissolves). */
  milk: number
  /** 0..1 rate at which new steam puffs are born on the water (puffs already up keep rising after it drops). */
  steam: number
  /** 0..1 of the water timer (00:00 to 10:00). */
  rest: number
  /** 0..1 of the milky drips falling from the flask as it comes out. */
  drip: number
  /** 0..1 the raw tree slides out of the funnel end (config/water.ts SLIDE). */
  slide: number
  /** 0..1 the raw tree moves to the foreground and stands upright. */
  stand: number
  /** Turn of the standing tree about Y, radians. */
  yaw: number
}

export const WATER_INITIAL: Readonly<WaterState> = { bucket: 0, boil: 0, milk: 0, steam: 0, rest: 0, drip: 0, slide: 0, stand: 0, yaw: 0 }

export const water: WaterState = { ...WATER_INITIAL }
