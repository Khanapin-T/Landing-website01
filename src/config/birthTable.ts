import { JAR, JAR_FLOOR_Y } from './birth'
import { RAW } from './water'

/**
 * The table the acid jar stands on, with the other glass vessels around it (Act 7, decor only). Everything here
 * rides with the jar (jarOffsetY). Sizes in world units (1 = 1 cm), z is world z (the acid jar axis is x = 0, z = RAW.z).
 * Tune by eye; the layout is pinned by birthTable.test.ts.
 */

/** The acid jar axis on the table. */
export const JAR_AXIS = { x: 0, z: RAW.z } as const

/**
 * Table slab. The top is 0.003 under JAR_FLOOR_Y so the jar and the vessels (whose bases sit at JAR_FLOOR_Y) never
 * z-fight with it. It is much wider than the frame (the left and right ends are out of view) and its front edge is
 * under the bottom of the jar view.
 */
export const TABLE = {
  halfX: 18,
  backZ: RAW.z - 9,
  frontZ: RAW.z + 6,
  thickness: 0.45,
  topY: JAR_FLOOR_Y - 0.003,
  color: '#0a1015',
  roughness: 0.45,
  metalness: 0.2,
  envMapIntensity: 0.45,
} as const

/** Faint green spill of the acid on the table under the jar: an additive radial glow quad (colour times intensity). */
export const TABLE_GLOW = { color: '#5cff2e', intensity: 0.55, radius: 4.6, lift: 0.0015 } as const

/** Look of the other vessels' glass (the acid jar's glass is brighter on purpose) and their wall thickness. */
export const VESSEL_GLASS = { color: '#a9b8b6', opacity: 0.045, envMapIntensity: 0.55, rim: 0.22, wall: 0.05, segments: 40 } as const

export type VesselKind = 'cylinder' | 'flask' | 'squat' | 'bottle' | 'beaker'

export interface VesselSpec {
  id: string
  kind: VesselKind
  /** World position of the vessel axis on the table. */
  x: number
  z: number
  /** Largest outer radius (the footprint) and total height. */
  radius: number
  height: number
  /** Contents: `fill` = filled height as a fraction of `height`. null = empty. */
  content: { color: string; fill: number; opacity: number } | null
}

const WATER = '#3f5f5c'
const AMBER = '#6e4a1a'

/** Behind and beside the acid jar (never in front of it), a couple on the left (calm side). Muted contents. */
export const VESSELS: readonly VesselSpec[] = [
  { id: 'tall', kind: 'cylinder', x: 2.9, z: RAW.z - 0.6, radius: 0.5, height: 3.6, content: { color: WATER, fill: 0.72, opacity: 0.3 } },
  { id: 'flask', kind: 'flask', x: 5.1, z: RAW.z - 2.4, radius: 1.0, height: 3.3, content: { color: AMBER, fill: 0.3, opacity: 0.4 } },
  { id: 'squat', kind: 'squat', x: -3.7, z: RAW.z - 1.2, radius: 1.1, height: 1.4, content: null },
  { id: 'bottle', kind: 'bottle', x: 1.8, z: RAW.z - 3.5, radius: 0.5, height: 1.7, content: { color: AMBER, fill: 0.55, opacity: 0.4 } },
  { id: 'beaker', kind: 'beaker', x: -6.2, z: RAW.z - 2.9, radius: 0.85, height: 2.1, content: { color: WATER, fill: 0.5, opacity: 0.28 } },
]

type P = [number, number]

/**
 * Outer wall of a vessel as a lathe profile (x = radius, y = height above the table), from the centre of the base up
 * to the rim; y never decreases.
 */
export function vesselOuterProfile(v: Pick<VesselSpec, 'kind' | 'radius' | 'height'>): P[] {
  const { radius: r, height: h } = v
  switch (v.kind) {
    case 'cylinder':
    case 'beaker':
      return [[0, 0], [r - 0.06, 0], [r, 0.06], [r, h]]
    case 'squat':
      return [[0, 0], [r - 0.08, 0], [r, 0.08], [r, h * 0.78], [r * 0.9, h]]
    case 'bottle': {
      const neck = r * 0.38
      return [[0, 0], [r - 0.05, 0], [r, 0.05], [r, h * 0.6], [r * 0.55, h * 0.78], [neck, h * 0.84], [neck, h]]
    }
    case 'flask': {
      // Florence flask: a sphere of radius r (small flat base) and a narrow neck.
      const neck = r * 0.3
      const pts: P[] = [[0, 0], [r * 0.3, 0]]
      for (let i = 0; i <= 8; i++) {
        const a = ((-60 + 15 * i) * Math.PI) / 180
        pts.push([r * Math.cos(a), r + r * Math.sin(a)])
      }
      pts.push([neck, r * 2.3], [neck, h])
      return pts
    }
  }
}

/** Inner wall of the glass: the outer wall pulled in by `wall` and lifted off the table by `wall` (centre excluded). */
function innerProfile(outer: P[], wall: number): P[] {
  return outer.slice(1).map(([x, y]) => [Math.max(x - wall, 0.02), Math.max(y, wall)] as P)
}

/** The closed glass shell profile: outer wall up, across the rim, inner wall down, inner floor to the axis. */
export function vesselGlassProfile(v: Pick<VesselSpec, 'kind' | 'radius' | 'height'>, wall: number = VESSEL_GLASS.wall): P[] {
  const outer = vesselOuterProfile(v)
  return [...outer, ...innerProfile(outer, wall).reverse(), [0, wall]]
}

/** The liquid body: the inner volume up to `fill` of the height, closed flat at the top. null for an empty vessel. */
export function vesselContentProfile(v: VesselSpec, wall: number = VESSEL_GLASS.wall): P[] | null {
  if (!v.content) return null
  const top = v.content.fill * v.height
  const inner = innerProfile(vesselOuterProfile(v), wall)
  const out: P[] = [[0, wall]]
  let prev: P = [0, wall]
  for (const p of inner) {
    if (p[1] <= top) {
      out.push(p)
      prev = p
      continue
    }
    const t = p[1] === prev[1] ? 1 : (top - prev[1]) / (p[1] - prev[1])
    out.push([prev[0] + (p[0] - prev[0]) * t, top])
    break
  }
  const last = out[out.length - 1]
  if (last[1] < top) out.push([last[0], top])
  out.push([0, top])
  return out
}

/** Smallest distance between the edges of two round footprints on the table (negative = overlap). */
export function footprintGap(a: { x: number; z: number; radius: number }, b: { x: number; z: number; radius: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z) - a.radius - b.radius
}

/** The acid jar's footprint on the table. */
export const JAR_FOOTPRINT = { x: JAR_AXIS.x, z: JAR_AXIS.z, radius: JAR.radius } as const
