import { Quaternion, Vector3 } from 'three'
import { MOLD, TREE_SLOTS } from '../../config/mold'
import { PRINT, RING_HALF } from '../../config/print'
import { newPose, type Pose } from '../ring/pose'

const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)

/** Ring-local half extents (bbox 2.35 x 2.48 x 1.03 cm normalized to height 1). */
export const RING_HALF_EXTENTS = new Vector3(2.35 / 2.48 / 2, 0.5, 1.03 / 2.48 / 2)

/**
 * Where slot `i` puts a ring (ring-local -> world): Ry(azimuth) * Rz(-tilt), translated so the sprue tip
 * (ring-local (0, -(RING_HALF + sprue), 0)) lies on the trunk surface at height `y`.
 */
export function slotPose(i: number, out: Pose = newPose()): Pose {
  const s = TREE_SLOTS[i]
  const qTilt = new Quaternion().setFromAxisAngle(Z, -s.tilt)
  const qAz = new Quaternion().setFromAxisAngle(Y, s.azimuth)
  out.quaternion.copy(qAz).multiply(qTilt)
  out.position
    .set(0, RING_HALF + PRINT.sprue.length, 0)
    .applyQuaternion(qTilt)
    .add(new Vector3(MOLD.trunk.radius, 0, 0))
    .applyQuaternion(qAz)
    .add(new Vector3(0, s.y, 0))
  return out
}

/** The 8 corners of slot `i`'s ring bounding box in world space (for fit checks). */
export function ringBoxCorners(i: number): Vector3[] {
  const { position, quaternion } = slotPose(i)
  const out: Vector3[] = []
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        out.push(
          new Vector3(sx * RING_HALF_EXTENTS.x, sy * RING_HALF_EXTENTS.y, sz * RING_HALF_EXTENTS.z)
            .applyQuaternion(quaternion)
            .add(position),
        )
      }
  return out
}
