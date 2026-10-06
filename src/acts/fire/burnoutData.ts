import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { detachAt } from '../../config/fire'
import { sampleSurface } from '../../scene/particles/particleData'
import { slotPose } from '../../scene/tree/slots'

/** Points sampled on each part of the tree (the ring points are used for all four rings, sprues are thin). */
export const BURNOUT_COUNTS = { trunk: 1200, ring: 3000, sprue: 250 } as const

/** One piece of the tree: a local-space geometry, the matrix that places it in the flask frame, and its point count. */
export interface BurnoutPart {
  geometry: THREE.BufferGeometry
  matrix: THREE.Matrix4
  count: number
}

/**
 * The whole tree as parts in the (unflipped) flask frame = world space: the trunk at its bottom, and for each of the
 * four tree slots a ring and its sprue (both modeled around the ring origin, which slotPose places).
 */
export function buildBurnoutParts(ring: THREE.BufferGeometry, sprue: THREE.BufferGeometry, trunk: THREE.BufferGeometry): BurnoutPart[] {
  const parts: BurnoutPart[] = [
    { geometry: trunk, matrix: new THREE.Matrix4().makeTranslation(0, MOLD.trunk.bottomY, 0), count: BURNOUT_COUNTS.trunk },
  ]
  for (let i = 0; i < 4; i++) {
    const { position, quaternion } = slotPose(i)
    const matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1))
    parts.push({ geometry: ring, matrix, count: BURNOUT_COUNTS.ring })
    parts.push({ geometry: sprue, matrix, count: BURNOUT_COUNTS.sprue })
  }
  return parts
}

/**
 * Area-weighted surface points of every part, transformed to world space and shuffled across parts (Fisher-Yates), so
 * a prefix of the array is a fair sample of the whole tree: the quality steps only change the draw range.
 */
export function sampleParts(parts: readonly BurnoutPart[], rand: () => number): Float32Array {
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

export interface BurnoutBuffers {
  /** World position of each point on the tree (also the geometry's `position`). */
  position: Float32Array
  /** Burn value at which the point detaches (the front reaches its height). */
  start: Float32Array
  seed: Float32Array
  count: number
}

export function burnoutBuffers(points: Float32Array, rand: () => number): BurnoutBuffers {
  const count = points.length / 3
  const start = new Float32Array(count)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    start[i] = detachAt(points[i * 3 + 1])
    seed[i] = rand()
  }
  return { position: points, start, seed, count }
}
