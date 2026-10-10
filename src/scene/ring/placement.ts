import { RING_COUNT } from '../../config/print'
import type { RingState } from '../../story/store'
import { slotPose } from '../tree/slots'
import { blendPose, newPose, ringPose, type Pose } from './pose'

// Module-level: the slot poses are fixed, and nothing is allocated per call.
const SLOTS: readonly Pose[] = Array.from({ length: RING_COUNT }, (_, k) => slotPose(k))
const free = newPose()

const smooth = (t: number) => {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

/** Ring k's drawn size: the print size while in the row, full size (1) once seated on its slot. */
export function flightScale(printScale: number, flight: number): number {
  return printScale + (1 - printScale) * smooth(flight)
}

/**
 * Where ring k is drawn (ring-local -> world): its print-row pose (ringPose) blended into tree slot k by
 * ring.flight[k] (Act 3), straight for now. Writes the pose into `out` and returns the uniform scale. Exact at both
 * ends: flight 0 = ringPose(k), flight 1 = slotPose(k) at scale 1.
 */
export function ringPlacement(ring: Readonly<RingState>, k: number, out: Pose): number {
  ringPose(ring, k, free)
  const t = ring.flight[k]
  if (t <= 0) {
    out.position.copy(free.position)
    out.quaternion.copy(free.quaternion)
  } else if (t >= 1) {
    out.position.copy(SLOTS[k].position)
    out.quaternion.copy(SLOTS[k].quaternion)
  } else {
    blendPose(free, SLOTS[k], t, out)
  }
  return flightScale(ring.scale, t)
}
