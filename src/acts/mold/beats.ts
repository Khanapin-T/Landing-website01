import { TOTAL_SCREENS } from '../../config/acts'

/** Act 3 choreography in absolute screens (mold 4.0..6.5). Tune by eye. */
export const MOLD_BEATS = {
  /** Act 3 props render in [windowFrom, windowTo]; the flask with the tree stays until Act 4 takes over. */
  windowFrom: 4.0,
  windowTo: TOTAL_SCREENS,
  /** Camera pulls back to the tree view. */
  camFrom: 4.0,
  camTo: 4.4,
  baseInFrom: 4.05,
  baseInTo: 4.3,
  copyIn: 4.0,
  /**
   * The wax trunk grows up from the cone once the base has landed (power2.out: within 0.006 of its seat at 4.29),
   * between the hovering print row (no ring is in its way).
   */
  trunkFrom: 4.29,
  trunkTo: 4.46,
  /**
   * Then the four printed rings fly to their slots one after another, in ASSEMBLY.order (src/config/assembly.ts): the
   * i-th flight runs over [flightFrom + i * flightStagger, + flightLen]; the last ring is seated before the flask drops.
   */
  flightFrom: 4.44,
  flightStagger: 0.1,
  flightLen: 0.16,
  flaskFrom: 4.95,
  flaskTo: 5.25,
  tapeFrom: 5.25,
  tapeTo: 5.65,
  fillFrom: 5.65,
  fillTo: 6.0,
  /** The camera rises and tilts down into the flask before the pour and stays there (no return). */
  camRaiseFrom: 5.5,
  camRaiseTo: 5.8,
  /** Vacuum: the surface boils, the needle falls (mold.boil) and comes back to zero; the gauge goes right after. */
  boilFrom: 6.0,
  boilTo: 6.18,
  gaugeIn: 6.0,
  gaugeOut: 6.2,
  /** Rest: the investment thickens (timer up to 15 minutes) with the tape still on, then the tape comes off. */
  restFrom: 6.2,
  restTo: 6.36,
  /** Tape unwinds. */
  unwrapFrom: 6.36,
  unwrapTo: 6.5,
  /** The rubber base drops out of the frame. */
  baseOutFrom: 6.4,
  baseOutTo: 6.5,
  copyOut: 6.44,
  /** Step list cues (start screens). */
  steps: { tree: 4.0, flask: 4.95, tape: 5.25, investment: 5.65, vacuum: 6.0, rest: 6.2, tapeOff: 6.36 },
} as const
