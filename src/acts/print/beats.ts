/** Act 2 choreography in absolute screens (print 2.5..4.0). Tune by eye. */
export const PRINT_BEATS = {
  /** Act 2 props render in [windowFrom, windowTo]: the resin bed lights up while Act 1's points pour in. */
  windowFrom: 2.1,
  windowTo: 4.0,
  /** Cure light under the resin bed comes on as the first points land (~2.16). */
  bedInFrom: 2.15,
  bedInTo: 2.45,
  /** Instant ring switch (hidden under the cure plane). */
  setup: 2.5,
  plateDownFrom: 2.5,
  plateDownTo: 2.75,
  chipIn: 2.55,
  copyIn: 2.6,
  printFrom: 2.75,
  printTo: 3.6,
  /** At 100% the supports crumble into a short puff while the ring still hangs on its sprue under the plate. */
  crumbleFrom: 3.6,
  crumbleTo: 3.72,
  /** Then the plate goes up and the ring turns over, still small (act 3 grows it back on its way to the tree). */
  liftFrom: 3.72,
  liftTo: 3.92,
  flipFrom: 3.72,
  flipTo: 3.97,
  /** The copy stays while the ring turns over, until act 3 starts. */
  copyOut: 3.97,
} as const
