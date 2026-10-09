/** Act 5 choreography in absolute screens (gold 9.0..11.5). Tune by eye. */
export const GOLD_BEATS = {
  /** Act 5 props render in [windowFrom, windowTo] (the flask itself persists in MoldScene). */
  windowFrom: 8.95,
  windowTo: 11.55,
  copyIn: 9.1,
  copyOut: 11.35,
  /** The vacuum chamber slides up onto the flask from below. */
  chamberFrom: 9.05,
  chamberTo: 9.35,
  /** The gauge appears the moment the chamber is on; then the needle falls to full vacuum. */
  gaugeIn: 9.35,
  gaugeOut: 11.35,
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
  /** The rest timer, and the heat that settles with it (Act 6 cools the rest). */
  restFrom: 10.5,
  restTo: 11.0,
  heatEnd: 0.45,
  /** Step list cues (start screens). */
  steps: { vacuum: 9.1, pour: 9.85, rest: 10.5 },
} as const
