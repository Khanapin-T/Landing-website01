import { TOTAL_SCREENS } from '../../config/acts'

/** Act 3 choreography in absolute screens (mold 4.0..6.5). Tune by eye. */
export const MOLD_BEATS = {
  /** Act 3 props render in [windowFrom, windowTo]; the flask with the tree stays until Act 4 takes over. */
  windowFrom: 4.0,
  windowTo: TOTAL_SCREENS,
  /**
   * Camera pulls back from LIFT_CAM (end of Act 2) to the tree view while the rings fly onto the tree (not before).
   */
  camFrom: 4.05,
  camTo: 4.5,
  /**
   * Right after Act 2 the rubber base rises in fast with the wax trunk already standing on it (mold.base and
   * mold.trunk run the same tween: the trunk moves with the base and stays in the flask when the base drops away at
   * the end of the act).
   */
  baseInFrom: 4.0,
  baseInTo: 4.15,
  copyIn: 4.0,
  /**
   * The full-size rings fly onto the tree right away, one right after another, in ASSEMBLY.order
   * (src/config/assembly.ts): the i-th flight runs over [flightFrom + i * flightStagger, + flightLen]; the first starts
   * while the base finishes its rise, all four are seated by 4.48, then a calm look at the finished tree.
   */
  flightFrom: 4.1,
  flightStagger: 0.06,
  flightLen: 0.2,
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
