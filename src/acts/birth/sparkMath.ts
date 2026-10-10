import * as THREE from 'three'
import { SPARKS } from '../../config/birth'
import { mulberry32 } from '../../lib/random'

/**
 * The sparks of one cut (Act 7). Pure functions of the cut progress `c` (0..1 of the ring's fall): no state, so the
 * burst is identical in both scroll directions. Each spark has a fixed direction, speed and life (seeded per slot);
 * its position at `c` is origin + dir * speed * (1 - exp(-drag c)) / drag - down * gravity c^2 / 2.
 */
export interface SparkSet {
  count: number
  /** Unit direction per spark, xyz. */
  dir: Float32Array
  /** World units per unit of c. */
  speed: Float32Array
  /** Life in c. */
  life: Float32Array
}

/** A burst's sparks: `out` is the horizontal direction away from the trunk, the spray is biased toward it and a little up. */
export function buildSparks(seed: number, out: THREE.Vector3): SparkSet {
  const rand = mulberry32(seed)
  const n = SPARKS.count
  const set: SparkSet = { count: n, dir: new Float32Array(n * 3), speed: new Float32Array(n), life: new Float32Array(n) }
  const v = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    // Uniform direction on the sphere, plus the outward and upward bias.
    const z = rand() * 2 - 1
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(1 - z * z)
    v.set(r * Math.cos(a), z, r * Math.sin(a)).addScaledVector(out, 0.9)
    v.y += 0.25
    v.normalize()
    set.dir[i * 3] = v.x
    set.dir[i * 3 + 1] = v.y
    set.dir[i * 3 + 2] = v.z
    set.speed[i] = SPARKS.speed[0] + (SPARKS.speed[1] - SPARKS.speed[0]) * Math.pow(rand(), 1.5)
    set.life[i] = SPARKS.life[0] + (SPARKS.life[1] - SPARKS.life[0]) * rand()
  }
  return set
}

/** Age 0..1 of a spark with life `life` at cut progress `c`; -1 when it is not alive (before the cut, or spent). */
export function sparkAge(c: number, life: number): number {
  return c <= 0 || c >= life ? -1 : c / life
}

/** World position of spark `i` at cut progress `c` (c is clamped to its life). */
export function sparkPos(set: SparkSet, i: number, c: number, origin: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const t = Math.min(Math.max(c, 0), set.life[i])
  const run = (set.speed[i] * (1 - Math.exp(-SPARKS.drag * t))) / SPARKS.drag
  return out.set(
    origin.x + set.dir[i * 3] * run,
    origin.y + set.dir[i * 3 + 1] * run - 0.5 * SPARKS.gravity * t * t,
    origin.z + set.dir[i * 3 + 2] * run,
  )
}

/** The flash's age 0..1 at cut progress `c`, -1 when it is not shown. */
export function flashAge(c: number): number {
  return sparkAge(c, SPARKS.flashLife)
}

const H = new THREE.Vector3()
const T = new THREE.Vector3()

/**
 * Writes one burst into the streak buffers, starting at quad `quad` (the flash first, then one quad per spark): per
 * vertex head xyz, tail xyz and age (-1 = hidden). Four identical vertices per quad (the shader tells the corners apart
 * by its static aCorner attribute). Returns the next free quad.
 */
export function writeBurst(
  set: SparkSet,
  origin: THREE.Vector3,
  c: number,
  quad: number,
  head: Float32Array,
  tail: Float32Array,
  age: Float32Array,
): number {
  const put = (q: number, h: THREE.Vector3, t: THREE.Vector3, a: number) => {
    for (let k = 0; k < 4; k++) {
      const v = q * 4 + k
      head[v * 3] = h.x
      head[v * 3 + 1] = h.y
      head[v * 3 + 2] = h.z
      tail[v * 3] = t.x
      tail[v * 3 + 1] = t.y
      tail[v * 3 + 2] = t.z
      age[v] = a
    }
  }
  put(quad++, origin, origin, flashAge(c))
  for (let i = 0; i < set.count; i++) {
    const a = sparkAge(c, set.life[i])
    if (a < 0) {
      put(quad++, origin, origin, -1)
      continue
    }
    sparkPos(set, i, c, origin, H)
    sparkPos(set, i, c - SPARKS.trail, origin, T)
    put(quad++, H, T, a)
  }
  return quad
}

/** Quads per burst (the flash plus the sparks). */
export const QUADS_PER_BURST = SPARKS.count + 1
