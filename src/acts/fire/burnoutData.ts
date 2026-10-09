import * as THREE from 'three'
import { detachAt } from '../../config/fire'
import { buildTreeParts, sampleParts, type TreePart } from '../../scene/tree/treeSamples'

/** Points sampled on each part of the tree (the ring points are used for all four rings, sprues are thin). */
export const BURNOUT_COUNTS = { trunk: 1200, ring: 3000, sprue: 250 } as const

export type BurnoutPart = TreePart

export { sampleParts }

export function buildBurnoutParts(ring: THREE.BufferGeometry, sprue: THREE.BufferGeometry, trunk: THREE.BufferGeometry): BurnoutPart[] {
  return buildTreeParts(ring, sprue, trunk, BURNOUT_COUNTS)
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
