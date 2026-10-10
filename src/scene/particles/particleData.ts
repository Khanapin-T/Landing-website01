import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { PRINT, RING_COUNT, RING_HALF, ringPrintX, ringPrintZ } from '../../config/print'

export interface ParticleBuffers {
  /** Start positions (xyz). Also the geometry's `position` attribute. */
  from: Float32Array
  /** End positions (xyz). */
  to: Float32Array
  /** Start of each particle's flight in stream progress, 0..0.65 (flight lasts 0.35). */
  delay: Float32Array
  /** Per-particle random 0..1 (size, swirl phase). */
  seed: Float32Array
  /** Optional second flight: where each point goes when it is consumed (xyz). */
  front?: Float32Array
  /** Feed progress (0..1) at which each point reaches `front`. */
  arrive?: Float32Array
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

/**
 * Which of the four printed rings point `i` feeds. Every 4th point: the sampled points come in random surface order,
 * so each ring gets an even quarter of the whole surface.
 */
export function streamRing(i: number): number {
  return i % RING_COUNT
}

/**
 * The resin stream: the dissolved CAD ring pours into the resin bed (bottom points first), and while printing each
 * point flies to its own spot on one of the four printed rings (streamRing), arriving when the cure front reaches it
 * (printPose: the rings hang upside down, flipped PI around Z about their own centres at their grid spots (ringPrintX(k), ringPrintZ(k)), so x and y
 * mirror and z stays; they print at PRINT.scale).
 */
export function resinStream(from: Float32Array, rand: () => number): ParticleBuffers {
  const count = from.length / 3
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < count; i++) {
    minY = Math.min(minY, from[i * 3 + 1])
    maxY = Math.max(maxY, from[i * 3 + 1])
  }
  const h = maxY - minY || 1
  const { pool, cureY, sprue, scale } = PRINT
  const printed = 2 * RING_HALF + sprue.length
  const to = new Float32Array(count * 3)
  const front = new Float32Array(count * 3)
  const delay = new Float32Array(count)
  const arrive = new Float32Array(count)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const x = from[i * 3]
    const y = from[i * 3 + 1]
    const z = from[i * 3 + 2]
    // Rectangular bed under the whole build plate, thinning toward its edge.
    const u = rand() * 2 - 1
    const v = rand() * 2 - 1
    const r = Math.max(Math.abs(u), Math.abs(v))
    to[i * 3] = u * pool.halfWidth
    to[i * 3 + 1] = pool.y + (rand() - 0.5) * pool.thickness * (1 - 0.6 * r)
    to[i * 3 + 2] = v * pool.halfDepth
    front[i * 3] = -x * scale + ringPrintX(streamRing(i))
    front[i * 3 + 1] = cureY
    front[i * 3 + 2] = z * scale + ringPrintZ(streamRing(i))
    delay[i] = ((y - minY) / h) * 0.55 + rand() * 0.1
    arrive[i] = Math.min(Math.max((y + RING_HALF + sprue.length) / printed, 0), 1)
    seed[i] = rand()
  }
  return { from, to, delay, seed, front, arrive, count }
}

/** Visible particle count for the current quality step. Changes only the draw range, never the buffers. */
export function particleDrawCount(count: number, scale: number, reduceMotion: boolean): number {
  return Math.floor(count * scale * (reduceMotion ? 0.5 : 1))
}
