/** Act 5 choreography in absolute screens (gold 9.0..11.5). Tune by eye. */
export const GOLD_BEATS = {
  /** Act 5 props render in [windowFrom, windowTo] (the flask itself persists in MoldScene). */
  windowFrom: 8.95,
  windowTo: 11.55,
  copyIn: 9.1,
  copyOut: 11.35,
  /** The gauge is in with the copy; the needle falls to full vacuum. */
  gaugeIn: 9.1,
  gaugeOut: 11.35,
  vacuumFrom: 9.2,
  vacuumTo: 9.8,
  /** X-ray on, the stream and the solid fill, flash, cooling, X-ray off (after the flash). */
  xrayInFrom: 9.85,
  xrayInTo: 10.0,
  fillFrom: 10.0,
  fillTo: 10.9,
  coolFrom: 10.9,
  coolTo: 11.2,
  xrayOutFrom: 11.2,
  xrayOutTo: 11.32,
  /** The rest timer, and the heat that settles with it (Act 6 cools the rest). */
  restFrom: 10.95,
  restTo: 11.45,
  heatEnd: 0.45,
  /** Step list cues (start screens). */
  steps: { vacuum: 9.1, pour: 9.85, rest: 10.95 },
} as const
