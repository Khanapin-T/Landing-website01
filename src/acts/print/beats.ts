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
  liftFrom: 3.6,
  liftTo: 3.85,
  flipFrom: 3.6,
  flipTo: 3.95,
  bedOutFrom: 3.6,
  bedOutTo: 3.8,
  copyOut: 3.85,
} as const
