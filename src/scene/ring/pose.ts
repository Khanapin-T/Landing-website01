import { Quaternion, Vector3 } from 'three'
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

/** The ring's placement before it joins the tree: T(0, y, 0) * Rz(flip) * Ry(yaw). */
export function ringPose(ring: Pick<RingState, 'y' | 'flip' | 'yaw'>, out: Pose): Pose {
  out.position.set(0, ring.y, 0)
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
