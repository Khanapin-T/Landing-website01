import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PRINT, RING_HALF } from '../../config/print'

/**
 * One print support in the PRINT FRAME: world axes, origin at the ring centre while it prints upside down (world =
 * frame + (0, story ring y, 0)). The plate's underside is at `plateY`, the tip touches the part at `contactY` below it.
 */
export interface Support {
  x: number
  z: number
  contactY: number
  plateY: number
  /** Random 0..1: when it breaks off and how it tumbles. */
  seed: number
}

/** The plate's underside in the print frame: the sprue top (sprue on the shank bottom, ring upside down). */
export const PLATE_FRAME_Y = RING_HALF + PRINT.sprue.length

/**
 * A ray cast in UPRIGHT ring-local space from (x, -PLATE_FRAME_Y, z) straight up (+Y): the first surface hit's local
 * y, or null for a miss. That is the part's surface the support meets, seen from the plate.
 */
export type CastUp = (x: number, z: number) => number | null

/** `count` items spread evenly over `items` (sorted by the caller), all of them if there are fewer. */
function spread<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) return [...items]
  return Array.from({ length: count }, (_, i) => items[Math.round((i * (items.length - 1)) / (count - 1))])
}

/**
 * Supports wherever the layers need something to hang from: rays from the plate onto the first surface facing it, on a
 * jittered grid (ring-local x, z), none on the sprue, mirrored into the print frame. Short ones (onto the shank and
 * shoulders) are all kept; the long ones past the narrow shank onto the wider part are kept only in front of and behind
 * it, sideCount per side spread across x.
 */
export function computeSupports(castUp: CastUp, rand: () => number): Support[] {
  const { gridX, gridZ, spanX, spanZ, jitter, sprueClear, minLength, maxLength, sideMinZ, sideCount, bite } = PRINT.supports
  const out: Support[] = []
  const sides: [Support[], Support[]] = [[], []]
  for (let i = 0; i < gridX; i++) {
    for (let j = 0; j < gridZ; j++) {
      const x = -spanX + (2 * spanX * i) / (gridX - 1) + (rand() - 0.5) * jitter
      const z = -spanZ + (2 * spanZ * j) / (gridZ - 1) + (rand() - 0.5) * jitter
      const seed = rand()
      if (Math.abs(x) < sprueClear && Math.abs(z) < sprueClear) continue
      const hit = castUp(x, z)
      if (hit === null) continue
      const length = hit + PLATE_FRAME_Y
      if (length < minLength) continue
      // Upside down (Rz(PI)): x and y mirror, z stays. The tip bites into the part (lower in the print frame).
      const s: Support = { x: -x, z, contactY: -hit - bite, plateY: PLATE_FRAME_Y, seed }
      if (length <= maxLength) out.push(s)
      else if (Math.abs(z) >= sideMinZ) sides[z < 0 ? 0 : 1].push(s)
    }
  }
  for (const side of sides) out.push(...spread(side.sort((a, b) => a.x - b.x || a.z - b.z), sideCount))
  return out
}

/** Raycaster-backed CastUp against a ring geometry (upright, ring-local). Built once at load. */
export function meshCastUp(geometry: THREE.BufferGeometry): CastUp {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  const ray = new THREE.Raycaster()
  const origin = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  return (x, z) => {
    ray.set(origin.set(x, -PLATE_FRAME_Y - 0.01, z), up)
    const hit = ray.intersectObject(mesh, false)[0]
    return hit ? hit.point.y : null
  }
}

function tagged(g: THREE.BufferGeometry, s: Support): THREE.BufferGeometry {
  const n = g.getAttribute('position').count
  const center = new Float32Array(n * 3)
  const seed = new Float32Array(n).fill(s.seed)
  const cy = (s.contactY + s.plateY) / 2
  for (let i = 0; i < n; i++) center.set([s.x, cy, s.z], i * 3)
  g.setAttribute('aCenter', new THREE.BufferAttribute(center, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  return g
}

/**
 * All supports as ONE geometry in the print frame (one draw call): per support a foot on the plate, the column and a
 * cone tip down to the contact. Every vertex carries its support's centre (`aCenter`) and `aSeed` for the fall.
 */
export function buildSupportGeometry(supports: readonly Support[]): THREE.BufferGeometry {
  const { radius, tipRadius, tipLength, baseRadius, baseHeight } = PRINT.supports
  const parts: THREE.BufferGeometry[] = []
  for (const s of supports) {
    const length = s.plateY - s.contactY
    const tip = Math.min(tipLength, length * 0.5)
    const foot = Math.min(baseHeight, length * 0.2)
    const column = Math.max(length - tip - foot, 0.001)
    parts.push(tagged(new THREE.CylinderGeometry(baseRadius * 0.7, baseRadius, foot, 10, 1, false).translate(s.x, s.plateY - foot / 2, s.z), s))
    parts.push(tagged(new THREE.CylinderGeometry(radius, radius, column, 8, 1, true).translate(s.x, s.plateY - foot - column / 2, s.z), s))
    parts.push(tagged(new THREE.CylinderGeometry(radius, tipRadius, tip, 8, 1, false).translate(s.x, s.contactY + tip / 2, s.z), s))
  }
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error('supports: geometry merge failed')
  return merged
}

export interface SupportPoints {
  position: Float32Array
  /** The support's centre for each point (the same fall as its support). */
  center: Float32Array
  seed: Float32Array
  /** Random -1..1 direction per point for the break-up spread. */
  jitter: Float32Array
  count: number
}

/** `perSupport` points on each support's surface, for the break-up into particles. */
export function sampleSupportPoints(supports: readonly Support[], perSupport: number, rand: () => number): SupportPoints {
  const count = supports.length * perSupport
  const position = new Float32Array(count * 3)
  const center = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const jitter = new Float32Array(count * 3)
  const r = PRINT.supports.radius
  let k = 0
  for (const s of supports) {
    const cy = (s.contactY + s.plateY) / 2
    for (let i = 0; i < perSupport; i++, k++) {
      const a = rand() * Math.PI * 2
      position.set([s.x + Math.cos(a) * r, s.contactY + rand() * (s.plateY - s.contactY), s.z + Math.sin(a) * r], k * 3)
      center.set([s.x, cy, s.z], k * 3)
      seed[k] = s.seed
      jitter.set([rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1], k * 3)
    }
  }
  return { position, center, seed, jitter, count }
}
