/** Act 2 choreography in absolute screens (print 2.5..4.0). Tune by eye. */
export const PRINT_BEATS = {
  /** Act 2 props render in [windowFrom, windowTo]: the resin bed lights up while Act 1's points pour in. */
  windowFrom: 2.1,
  windowTo: 4.0,
  /** Cure light under the resin bed comes on as the first points land (~2.16). */
  bedInFrom: 2.15,
  bedInTo: 2.45,
  /** Instant ring switch (hidden under the cure plane): one CAD ring becomes four resin rings in the print grid. */
  setup: 2.5,
  plateDownFrom: 2.5,
  plateDownTo: 2.75,
  chipIn: 2.55,
  copyIn: 2.6,
  printFrom: 2.75,
  printTo: 3.6,
  /** At 100% the supports crumble into a short puff while the rings still hang on their sprues under the plate. */
  crumbleFrom: 3.6,
  crumbleTo: 3.72,
  /** Then the plate goes up out of the frame and the four rings turn over. */
  liftFrom: 3.72,
  liftTo: 3.92,
  /** While they turn over, the front two move out to PRINT.grid.frontX, the back two to backX. */
  spreadFrom: 3.72,
  spreadTo: 3.95,
  /** Meanwhile they grow to full size (the size they have on the tree) and the camera pulls back to LIFT_CAM. */
  growFrom: 3.74,
  growTo: 3.95,
  camFrom: 3.72,
  camTo: 3.97,
  flipFrom: 3.72,
  flipTo: 3.97,
  /** The copy stays while the ring turns over, until act 3 starts. */
  copyOut: 3.97,
} as const
