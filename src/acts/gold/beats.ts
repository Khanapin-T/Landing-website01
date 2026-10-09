/** Act 5 choreography in absolute screens (gold 9.0..11.5). Tune by eye. */
export const GOLD_BEATS = {
  /** Act 5 props render in [windowFrom, windowTo] (the flask itself persists in MoldScene). */
  windowFrom: 8.95,
  windowTo: 11.55,
  copyIn: 9.1,
  /** The copy column (and the rest timer at 10:00) stays after the act until act 6 takes the column (WATER_BEATS.copyIn). */
  copyOut: 11.55,
  /** The vacuum chamber slides up onto the flask from below. */
  chamberFrom: 9.05,
  chamberTo: 9.35,
  /** The gauge appears the moment the chamber is on; then the needle falls to full vacuum. The gauge goes when the needle is back at zero (gaugeOut). */
  gaugeIn: 9.35,
  gaugeOut: 11.1,
  vacuumFrom: 9.4,
  vacuumTo: 9.8,
  /** X-ray on, the molten stream and the solid fill (bottom up, 0.45 screens), flash, cooling, X-ray off (after the flash). */
  xrayInFrom: 9.85,
  xrayInTo: 10.0,
  fillFrom: 10.0,
  fillTo: 10.45,
  coolFrom: 10.45,
  coolTo: 10.75,
  xrayOutFrom: 10.75,
  xrayOutTo: 10.87,
  /** A short moment under vacuum after the X-ray, then the rest starts: the needle falls back to zero, the chamber comes off, the heat fades to zero. */
  restFrom: 10.95,
  restTo: 11.4,
  unvacuumFrom: 10.95,
  unvacuumTo: 11.1,
  chamberOffFrom: 11.05,
  chamberOffTo: 11.3,
  /** Step list cues (start screens). */
  steps: { vacuum: 9.1, pour: 9.85, rest: 10.95 },
} as const
