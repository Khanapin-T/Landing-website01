import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

export interface ParticleBuffers {
  /** Start positions (xyz). Also the geometry's `position` attribute. */
  from: Float32Array
  /** End positions (xyz). */
  to: Float32Array
  /** Start of each particle's flight in stream progress, 0..0.65 (flight lasts 0.35). */
  delay: Float32Array
  /** Per-particle random 0..1 (size, swirl phase). */
  seed: Float32Array
  count: number
}

/** three 0.186 has `setRandomGenerator` at runtime, but @types/three 0.186 does not declare it. */
type SeededSampler = MeshSurfaceSampler & { setRandomGenerator(fn: () => number): MeshSurfaceSampler }

/**
 * Uniformly distributed points on a mesh surface (area-weighted).
 * MeshSurfaceSampler reads indexed and non-indexed geometry directly, so no copy is made.
 */
export function sampleSurface(geometry: THREE.BufferGeometry, count: number, rand: () => number): Float32Array {
  const sampler = (new MeshSurfaceSampler(new THREE.Mesh(geometry)) as SeededSampler).setRandomGenerator(rand).build()
  const out = new Float32Array(count * 3)
  const p = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    sampler.sample(p)
    out[i * 3] = p.x
    out[i * 3 + 1] = p.y
    out[i * 3 + 2] = p.z
  }
  return out
}

/** Targets for "the model breaks into points that stream down": bottom points leave first, all end below floorY. */
export function streamDown(
  from: Float32Array,
  rand: () => number,
  { floorY = -1.4, drop = 0.5, spread = 0.6 }: { floorY?: number; drop?: number; spread?: number } = {},
): ParticleBuffers {
  const count = from.length / 3
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < count; i++) {
    minY = Math.min(minY, from[i * 3 + 1])
    maxY = Math.max(maxY, from[i * 3 + 1])
  }
  const h = maxY - minY || 1
  const to = new Float32Array(count * 3)
  const delay = new Float32Array(count)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const x = from[i * 3]
    const y = from[i * 3 + 1]
    const z = from[i * 3 + 2]
    to[i * 3] = x * (1 + spread * rand())
    to[i * 3 + 1] = floorY - drop * rand()
    to[i * 3 + 2] = z * (1 + spread * rand())
    delay[i] = ((y - minY) / h) * 0.55 + rand() * 0.1
    seed[i] = rand()
  }
  return { from, to, delay, seed, count }
}

/** Visible particle count for the current quality step. Changes only the draw range, never the buffers. */
export function particleDrawCount(count: number, scale: number, reduceMotion: boolean): number {
  return Math.floor(count * scale * (reduceMotion ? 0.5 : 1))
}
