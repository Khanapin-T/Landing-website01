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
  copyIn: 4.1,
  /** The hero ring leaves the center and lands on its slot. */
  heroFrom: 4.1,
  heroTo: 4.4,
  /** The trunk starts after the base has landed and after the hero ring has left the axis (no piercing). */
  trunkFrom: 4.35,
  trunkTo: 4.6,
  /** Three clones pop in one after another. */
  cloneFrom: [4.6, 4.7, 4.8],
  cloneLen: 0.15,
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
  steps: { tree: 4.1, flask: 4.95, tape: 5.25, investment: 5.65, vacuum: 6.0, rest: 6.2, tapeOff: 6.36 },
} as const
