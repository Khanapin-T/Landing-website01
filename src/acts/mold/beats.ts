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
  baseInTo: 4.4,
  copyIn: 4.1,
  /** The hero ring leaves the center and lands on its slot. */
  heroFrom: 4.2,
  heroTo: 4.6,
  trunkFrom: 4.25,
  trunkTo: 4.55,
  /** Three clones pop in one after another. */
  cloneFrom: [4.6, 4.7, 4.8],
  cloneLen: 0.15,
  flaskFrom: 4.95,
  flaskTo: 5.25,
  tapeFrom: 5.25,
  tapeTo: 5.65,
  fillFrom: 5.65,
  fillTo: 6.0,
  /** Vacuum: the surface boils; the camera pushes in on the top. */
  boilFrom: 6.0,
  boilTo: 6.25,
  vacuumCamFrom: 6.0,
  vacuumCamTo: 6.1,
  /** Tape unwinds; the camera returns to the tree view. */
  unwrapFrom: 6.25,
  unwrapTo: 6.45,
  camBackFrom: 6.25,
  camBackTo: 6.4,
  /** The rubber base drops out of the frame. */
  baseOutFrom: 6.35,
  baseOutTo: 6.5,
  copyOut: 6.4,
  /** Step list cues (start screens). */
  steps: { tree: 4.1, flask: 4.95, tape: 5.25, investment: 5.65, vacuum: 6.0, tapeOff: 6.25 },
} as const
