/** Act 6 choreography in absolute screens (water 11.5..14.0). Tune by eye. */
export const WATER_BEATS = {
  /** Act 6 props render from windowFrom to 14.0; act 7 draws the same tree in the same pose from 14.0 (no overlap gap). */
  windowFrom: 11.45,
  windowTo: 14.0,
  copyIn: 11.65,
  /** The copy column (and the timer at 10:00) leaves just after the act; act 7 takes the column at BIRTH_BEATS.copyIn. */
  copyOut: 14.02,
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
  /**
   * The boil starts as the flask touches the water and builds with the dip (it spreads from the middle by
   * config/water.ts immersion), hardest when the flask is fully under (dipTo), then calms before the rest timer. Steam
   * is born on the water with it and stops being made shortly after dipTo; the puffs already up keep rising and fade.
   */
  boilFrom: 12.08,
  boilTo: 12.2,
  boilOutFrom: 12.26,
  boilOutTo: 12.45,
  steamFrom: 12.08,
  steamTo: 12.2,
  steamOutFrom: 12.23,
  steamOutTo: 12.27,
  milkFrom: 12.18,
  milkTo: 12.48,
  /** Calm white water, the timer runs; the investment is gone while the flask is under. */
  restFrom: 12.5,
  restTo: 13.0,
  wash: 12.75,
  /** The flask comes up on its own, milky drips fall from it. */
  riseFrom: 13.05,
  riseTo: 13.3,
  dripFrom: 13.2,
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
