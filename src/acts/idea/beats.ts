/** Act 1 choreography in absolute screens (intro 0..0.5, idea 0.5..2.5). Tune by eye. */
export const IDEA_BEATS = {
  /** Act 1 props render in [0, end]: the grid is already there under the intro title. */
  windowFrom: 0,
  windowTo: 2.5,
  drawFrom: 0.45,
  drawTo: 0.95,
  copyIn: 0.6,
  dimsFrom: 0.85,
  dimsTo: 1.05,
  dimLabelsIn: 1.0,
  dimLabelsOut: 1.15,
  dimsOutFrom: 1.15,
  dimsOutTo: 1.3,
  turnFrom: 1.2,
  turnTo: 2.05,
  fillFrom: 1.5,
  fillTo: 1.85,
  dissolveFrom: 2.0,
  dissolveTo: 2.45,
  /** Points fade into the resin they landed on. */
  pointsOutFrom: 2.4,
  pointsOutTo: 2.5,
  copyOut: 2.3,
  gridOutFrom: 2.3,
  gridOutTo: 2.5,
} as const
