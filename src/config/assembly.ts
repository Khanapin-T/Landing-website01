import { RING_COUNT } from './print'

type V3 = readonly [number, number, number]

/**
 * Act 3 assembly (author 2026-10-10): Act 2 leaves the four printed rings upright at full size (the size they have on
 * the tree), front two outer, back two inner; right away the rubber base rises in fast with the wax trunk standing on
 * it and the rings fly straight onto their tree slots one right after another while the camera pulls back
 * (src/scene/ring/placement.ts). Ring k's flight (story.ring.flight[k], 0..1) is a cubic curve from its Act 2 end
 * pose to a staging point outside slot k on the line of its sprue axis (turning into the slot orientation on the
 * way), then a straight slide along that axis until the sprue tip sits on the trunk surface (exactly slotPose(k)).
 * Every ring is printed on the side of its slot (config/print.ts PRINT_SPOTS). The order, staging distances and
 * departure handles are set so no ring ever passes through another ring, the trunk or the base: the contract is
 * src/acts/mold/assembly.test.ts.
 */
export const ASSEMBLY = {
  /**
   * Flight order (ring indices): the back pair first, onto the lower slots (2 from the back right to the front right
   * slot, then 3 to the back left slot: a seated slot 3 ring reaches over ring 2's print spot, so ring 2 must have left),
   * then the front pair onto the upper slots (1 to the back right, the hero ring 0 last, front left), each heading up
   * and out first (depart) so it clears the seated lower rings. A lower slot cannot be entered once the upper slots
   * next to it are taken (the rings interlock there, 0.007 apart).
   */
  order: [2, 3, 1, 0] as const,
  /** Part of each flight spent on the curve to the staging point; the rest is the straight slide onto the trunk. */
  curve: 0.7,
  /** Part of the curve by which the ring has turned into its slot orientation (it slides in already turned). */
  turn: 0.85,
  /** Per ring k: staging distance from the seat along the sprue axis (outward and up, away from the trunk). */
  stage: [0.6, 0.6, 0.45, 0.45] as readonly number[],
  /** Per ring k: the curve's first handle, an offset from the ring's Act 2 end pose (where it heads first). */
  depart: [
    [-0.6, 1.3, 0],
    [0.6, 1.3, 0],
    [0.4, 0.4, 0],
    [-0.4, 0.4, 0],
  ] as readonly V3[],
} as const

if (ASSEMBLY.stage.length !== RING_COUNT || ASSEMBLY.depart.length !== RING_COUNT || ASSEMBLY.order.length !== RING_COUNT)
  throw new Error('ASSEMBLY: one entry per ring')
