/** Act 2 choreography in absolute screens (print 2.5..4.0). Tune by eye. */
export const PRINT_BEATS = {
  /** Act 2 props render in [windowFrom, windowTo]: the vat rises in while Act 1 still dissolves. */
  windowFrom: 2.0,
  windowTo: 4.0,
  vatInFrom: 2.0,
  vatInTo: 2.35,
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
  vatOutFrom: 3.65,
  vatOutTo: 3.95,
  copyOut: 3.85,
} as const
