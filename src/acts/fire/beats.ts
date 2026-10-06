/** Act 4 choreography in absolute screens (fire 6.5..9.0). Tune by eye. */
export const FIRE_BEATS = {
  /** Act 4 props render in [windowFrom, windowTo] (the flask itself persists in MoldScene). */
  windowFrom: 6.45,
  windowTo: 9.05,
  /** The camera comes down from the pour view to a level view. */
  camFrom: 6.5,
  camTo: 6.9,
  /** The three coil rows fade in one after another (nearest first). */
  coilFrom: [6.55, 6.65, 6.75],
  coilLen: 0.25,
  copyIn: 6.95,
  copyOut: 8.9,
  /** Everything heats up. */
  heatFrom: 6.95,
  heatTo: 7.5,
  /** X-ray on, the tree burns away top to bottom, X-ray off. */
  xrayInFrom: 7.5,
  xrayInTo: 7.65,
  burnFrom: 7.7,
  burnTo: 8.4,
  xrayOutFrom: 8.4,
  xrayOutTo: 8.55,
  /** The flask turns over; the coils fade out and the heat settles for Act 5. */
  flipFrom: 8.6,
  flipTo: 8.95,
  coilOutFrom: [8.7, 8.78, 8.86],
  coilOutLen: 0.14,
  coolFrom: 8.7,
  coolTo: 9.0,
  heatEnd: 0.6,
  /** Step list cues (start screens). */
  steps: { furnace: 6.95, burnout: 7.5, flip: 8.6 },
} as const
