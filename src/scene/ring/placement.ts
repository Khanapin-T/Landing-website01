import { Vector3 } from 'three'
import { ASSEMBLY } from '../../config/assembly'
import { RING_COUNT } from '../../config/print'
import type { RingState } from '../../story/store'
import { slotPose } from '../tree/slots'
import { newPose, ringPose, type Pose } from './pose'

const { curve: CURVE, turn: TURN } = ASSEMBLY

// Module-level: the slot poses and the path points near the tree are fixed, and nothing is allocated per call.
const SLOTS: readonly Pose[] = Array.from({ length: RING_COUNT }, (_, k) => slotPose(k))
/** Ring k's sprue axis in the world (ring-local +Y at the slot: from the sprue tip toward the ring). */
const AXES: readonly Vector3[] = SLOTS.map((s) => new Vector3(0, 1, 0).applyQuaternion(s.quaternion))
/** Staging point: the slot position moved out along the sprue axis. */
const STAGES: readonly Vector3[] = SLOTS.map((s, k) => AXES[k].clone().multiplyScalar(ASSEMBLY.stage[k]).add(s.position))
/**
 * The curve's last handle: on the sprue axis beyond the staging point, at the distance that makes the curve's end
 * speed equal to the slide's speed (a cubic ends at 3 * handle / CURVE per unit of flight, the slide runs at
 * stage / (1 - CURVE)), so the ring enters the slide without a kink in its motion.
 */
const HANDLES_IN: readonly Vector3[] = STAGES.map((p, k) =>
  AXES[k].clone().multiplyScalar((ASSEMBLY.stage[k] * CURVE) / (3 * (1 - CURVE))).add(p),
)
const DEPART: readonly Vector3[] = ASSEMBLY.depart.map((d) => new Vector3(...d))

const row = newPose()
const p1 = new Vector3()

const smooth = (t: number) => {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

/** Ring k's drawn size: its size at flight 0 (full size since the end of Act 2), growing on the curve to 1 by the staging point. */
export function flightScale(printScale: number, flight: number): number {
  return printScale + (1 - printScale) * smooth(flight / CURVE)
}

/**
 * Where ring k is drawn (ring-local -> world) for ring.flight[k] (Act 3): at flight 0 exactly where Act 2 left it
 * (ringPose: its spread print-grid pose); then on a cubic curve straight from there to the staging point outside slot
 * k (first handle: the start + ASSEMBLY.depart[k], last handle: on the sprue axis), turning into the slot orientation
 * by TURN of the curve; then a straight slide along the sprue axis onto slotPose(k). Writes the pose into `out` and
 * returns the uniform scale. Exact at both ends: flight 0 = ringPose(k) at ring.scale (full size since the end of Act 2), flight 1 = slotPose(k) at
 * scale 1.
 */
export function ringPlacement(ring: Readonly<RingState>, k: number, out: Pose): number {
  const t = ring.flight[k]
  const slot = SLOTS[k]
  if (t <= 0) {
    ringPose(ring, k, out)
    return ring.scale
  }
  if (t >= 1) {
    out.position.copy(slot.position)
    out.quaternion.copy(slot.quaternion)
    return 1
  }
  ringPose(ring, k, row)
  if (t < CURVE) {
    const u = t / CURVE
    const a = 1 - u
    const p0 = row.position
    p1.copy(p0).add(DEPART[k])
    const p2 = HANDLES_IN[k]
    const p3 = STAGES[k]
    const b0 = a * a * a
    const b1 = 3 * a * a * u
    const b2 = 3 * a * u * u
    const b3 = u * u * u
    out.position.set(
      b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
      b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
      b0 * p0.z + b1 * p1.z + b2 * p2.z + b3 * p3.z,
    )
    out.quaternion.slerpQuaternions(row.quaternion, slot.quaternion, smooth(u / TURN))
  } else {
    out.position.lerpVectors(STAGES[k], slot.position, (t - CURVE) / (1 - CURVE))
    out.quaternion.copy(slot.quaternion)
  }
  return flightScale(ring.scale, t)
}
