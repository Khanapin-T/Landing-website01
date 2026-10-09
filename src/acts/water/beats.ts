import { TOTAL_SCREENS } from '../../config/acts'

/** Act 6 choreography in absolute screens (water 11.5..14.0). Tune by eye. */
export const WATER_BEATS = {
  /** Act 6 props render from windowFrom; the raw tree stays after the act as the end state until act 7 takes over. */
  windowFrom: 11.45,
  windowTo: TOTAL_SCREENS,
  copyIn: 11.65,
  /** The copy column (and the timer at 10:00) stays after the act until act 7 moves this to its own start. */
  copyOut: 20,
  /** Camera to the bucket view while the bucket rises in from below. */
  camFrom: 11.5,
  camTo: 11.9,
  bucketFrom: 11.5,
  bucketTo: 11.9,
  /** The flask turns onto its side (flip 1 -> SIDE_FLIP), then goes down into the water. */
  turnFrom: 11.7,
  turnTo: 11.95,
  dipFrom: 11.95,
  dipTo: 12.2,
  /** Boil only for the first moments (from when the flask touches the water), steam with it, the water turns white. */
  boilFrom: 12.05,
  boilTo: 12.12,
  boilOutFrom: 12.3,
  boilOutTo: 12.48,
  steamFrom: 12.05,
  steamTo: 12.2,
  steamOutFrom: 12.45,
  steamOutTo: 12.9,
  milkFrom: 12.12,
  milkTo: 12.45,
  /** Calm white water, the timer runs; the investment is gone while the flask is under. */
  restFrom: 12.5,
  restTo: 13.0,
  wash: 12.75,
  /** The flask comes up on its own, milky drips fall from it. */
  riseFrom: 13.05,
  riseTo: 13.3,
  dripFrom: 13.1,
  dripTo: 13.55,
  /** The tree slides out of the funnel end, then stands up in the foreground while the flask and the bucket go. */
  slideFrom: 13.35,
  slideTo: 13.6,
  standFrom: 13.6,
  standTo: 13.88,
  awayFrom: 13.6,
  awayTo: 13.9,
  camRawFrom: 13.6,
  camRawTo: 13.9,
  yawFrom: 13.6,
  yawTo: 14.0,
  /** Step list cues (start screens). */
  steps: { water: 11.65, rest: 12.5, treeOut: 13.35 },
} as const
