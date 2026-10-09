import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { sampleSurface } from '../particles/particleData'
import { slotPose } from './slots'

/** One piece of the tree: a local-space geometry, the matrix that places it in the flask frame, and its point count. */
export interface TreePart {
  geometry: THREE.BufferGeometry
  matrix: THREE.Matrix4
  count: number
}

export interface TreeCounts {
  trunk: number
  ring: number
  sprue: number
}

/**
 * The whole tree as parts in the (unflipped) flask frame = world space: the trunk at its bottom, and for each of the
 * four tree slots a ring and its sprue (both modeled around the ring origin, which slotPose places).
 */
export function buildTreeParts(
  ring: THREE.BufferGeometry,
  sprue: THREE.BufferGeometry,
  trunk: THREE.BufferGeometry,
  counts: TreeCounts,
): TreePart[] {
  const parts: TreePart[] = [
    { geometry: trunk, matrix: new THREE.Matrix4().makeTranslation(0, MOLD.trunk.bottomY, 0), count: counts.trunk },
  ]
  for (let i = 0; i < 4; i++) {
    const { position, quaternion } = slotPose(i)
    const matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1))
    parts.push({ geometry: ring, matrix, count: counts.ring })
    parts.push({ geometry: sprue, matrix, count: counts.sprue })
  }
  return parts
}

/**
 * Area-weighted surface points of every part, transformed to world space and shuffled across parts (Fisher-Yates), so
 * a prefix of the array is a fair sample of the whole tree: the quality steps only change the draw range.
 */
export function sampleParts(parts: readonly TreePart[], rand: () => number): Float32Array {
  const total = parts.reduce((n, p) => n + p.count, 0)
  const out = new Float32Array(total * 3)
  const v = new THREE.Vector3()
  let at = 0
  for (const part of parts) {
    const local = sampleSurface(part.geometry, part.count, rand)
    for (let i = 0; i < part.count; i++) {
      v.fromArray(local, i * 3).applyMatrix4(part.matrix)
      out[at * 3] = v.x
      out[at * 3 + 1] = v.y
      out[at * 3 + 2] = v.z
      at++
    }
  }
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    for (let k = 0; k < 3; k++) {
      const t = out[i * 3 + k]
      out[i * 3 + k] = out[j * 3 + k]
      out[j * 3 + k] = t
    }
  }
  return out
}
