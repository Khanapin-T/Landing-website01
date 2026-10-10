import { RING_COUNT } from './print'

type V3 = readonly [number, number, number]

/**
 * Act 3 assembly: after the wax trunk has grown between the hovering print row, the four rings fly to their tree
 * slots one after another (src/scene/ring/placement.ts). Ring k's flight (story.ring.flight[k], 0..1) is a cubic
 * curve from its row position to a staging point outside slot k on the line of its sprue axis (the ring grows to full
 * size and turns into the slot orientation on the way), then a straight slide along that axis until the sprue tip
 * sits on the trunk surface (exactly slotPose(k)). The order, staging distances and departure handles are set so no
 * ring ever passes through another ring, the trunk or the base: the contract is src/acts/mold/assembly.test.ts.
 */
export const ASSEMBLY = {
  /**
   * Flight order (ring indices): the two inner rings of the row first, each straight to its lower slot (3 back left,
   * then 2 front right), then the outer rings onto the upper slots from above (1 back right, the hero ring 0 last,
   * front left). No path crosses another: a lower slot cannot be entered once the upper slots are taken (the rings
   * interlock there, 0.007 apart), and the inner row positions overlap the lower slots (PRINT_ROW in config/print.ts).
   */
  order: [3, 2, 1, 0] as const,
  /** Part of each flight spent on the curve to the staging point; the rest is the straight slide onto the trunk. */
  curve: 0.7,
  /** Part of the curve by which the ring has turned into its slot orientation (it slides in already turned). */
  turn: 0.85,
  /** Per ring k: staging distance from the seat along the sprue axis (outward and up, away from the trunk). */
  stage: [0.6, 0.6, 0.4, 0.4] as readonly number[],
  /** Per ring k: the curve's first handle, an offset from the ring's row position (where it heads first: up and out). */
  depart: [
    [0, 1, 0.2],
    [0, 1, -0.2],
    [0.1, 0.5, 0.5],
    [-0.1, 0.5, -0.5],
  ] as readonly V3[],
} as const

if (ASSEMBLY.stage.length !== RING_COUNT || ASSEMBLY.depart.length !== RING_COUNT || ASSEMBLY.order.length !== RING_COUNT)
  throw new Error('ASSEMBLY: one entry per ring')
