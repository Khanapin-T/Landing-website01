/** Act 4 choreography in absolute screens (fire 6.5..9.0). Tune by eye. */
export const FIRE_BEATS = {
  /** Act 4 props render in [windowFrom, windowTo] (the flask itself persists in MoldScene). */
  windowFrom: 6.45,
  windowTo: 9.05,
  /** The camera comes down from the pour view to the furnace view: level and pulled back, the flask recedes into the springs. */
  camFrom: 6.5,
  camTo: 6.9,
  /** The three coil rows fade in one after another (nearest first). */
  coilFrom: [6.55, 6.65, 6.75],
  coilLen: 0.25,
  copyIn: 6.95,
  copyOut: 8.9,
  /** Everything heats up. */
  heatFrom: 6.95,
  heatTo: 7.45,
  /** X-ray on, the tree burns away top to bottom, X-ray off. */
  xrayInFrom: 7.45,
  xrayInTo: 7.58,
  burnFrom: 7.62,
  burnTo: 8.27,
  xrayOutFrom: 8.27,
  xrayOutTo: 8.4,
  /** Only after the X-ray: the flask comes back toward the camera (the camera returns), the coils leave, then it turns over. */
  camBackFrom: 8.42,
  camBackTo: 8.66,
  flipFrom: 8.66,
  flipTo: 8.98,
  coilOutFrom: [8.42, 8.5, 8.58],
  coilOutLen: 0.14,
  /** The heat settles for Act 5. */
  coolFrom: 8.5,
  coolTo: 9.0,
  heatEnd: 0.6,
  /** Step list cues (start screens). */
  steps: { furnace: 6.95, burnout: 7.45, flip: 8.42 },
} as const
