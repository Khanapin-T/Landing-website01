import { Quaternion, Vector3 } from 'three'
import { printRingX } from '../../config/print'
import type { RingState } from '../../story/store'

export interface Pose {
  position: Vector3
  quaternion: Quaternion
}

export const newPose = (): Pose => ({ position: new Vector3(), quaternion: new Quaternion() })

const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
const qa = new Quaternion()
const qb = new Quaternion()

/**
 * Ring k's placement in the print row, before it joins the tree: T(x_k, y, 0) * Rz(flip) * Ry(yaw) with
 * x_k = printRingX(k) * spread (each ring turns about its own centre).
 */
export function ringPose(ring: Pick<RingState, 'y' | 'flip' | 'yaw' | 'spread'>, k: number, out: Pose): Pose {
  out.position.set(printRingX(k) * ring.spread, ring.y, 0)
  qa.setFromAxisAngle(Z, ring.flip)
  qb.setFromAxisAngle(Y, ring.yaw)
  out.quaternion.copy(qa).multiply(qb)
  return out
}

/** Linear position, shortest-arc rotation. `out` may alias neither input. */
export function blendPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  out.position.lerpVectors(a.position, b.position, t)
  out.quaternion.slerpQuaternions(a.quaternion, b.quaternion, t)
  return out
}
