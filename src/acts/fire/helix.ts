import * as THREE from 'three'
import { COILS } from '../../config/fire'

const TAU = Math.PI * 2

/**
 * One heating coil of a wall in its local frame: x = along the runs (the depth), y = across the runs, z = out of the
 * wall. The spring's centerline is a serpentine in the (x, y) plane: three straight runs of length `length - spacing`
 * on y = +spacing, 0, -spacing, joined by two half circles of radius spacing / 2 at the far end (x = length) and the
 * near end (x = 0). The path starts on the top run at x = spacing / 2, heading away from the near end.
 */
export interface SerpentinePoint {
  s: number
  w: number
  /** Unit tangent in the plane. */
  ts: number
  tw: number
}

/** Total centerline length. */
export function serpentineTotal(length: number, spacing: number): number {
  return 3 * (length - spacing) + 2 * Math.PI * (spacing / 2)
}

/** Extent of the centerline in the local plane. */
export function serpentineBounds(length: number, spacing: number): { s: [number, number]; w: [number, number] } {
  return { s: [0, length], w: [-spacing, spacing] }
}

/** Centerline point and tangent at arclength `a` (clamped to the path). */
export function serpentinePoint(a: number, length: number, spacing: number): SerpentinePoint {
  const r = spacing / 2
  const run = length - 2 * r
  const turn = Math.PI * r
  const t = Math.min(Math.max(a, 0), serpentineTotal(length, spacing))
  if (t <= run) return { s: r + t, w: spacing, ts: 1, tw: 0 }
  if (t <= run + turn) {
    // Far end, top to middle, clockwise around (length - r, spacing / 2).
    const theta = Math.PI / 2 - (t - run) / r
    return { s: length - r + r * Math.cos(theta), w: spacing / 2 + r * Math.sin(theta), ts: Math.sin(theta), tw: -Math.cos(theta) }
  }
  if (t <= 2 * run + turn) return { s: length - r - (t - run - turn), w: 0, ts: -1, tw: 0 }
  if (t <= 2 * run + 2 * turn) {
    // Near end, middle to bottom, counterclockwise around (r, -spacing / 2).
    const theta = Math.PI / 2 + (t - 2 * run - turn) / r
    return { s: r + r * Math.cos(theta), w: -spacing / 2 + r * Math.sin(theta), ts: -Math.sin(theta), tw: Math.cos(theta) }
  }
  return { s: r + (t - 2 * run - 2 * turn), w: -spacing, ts: 1, tw: 0 }
}

/**
 * Point of the spring (the helix around the serpentine) at centerline arclength `a`. The helix offsets the centerline
 * by COILS.coilRadius in the plane normal N = e3 x T and along e3 (out of the wall), with the phase running with the
 * arclength, so tiers cut at any arclength join seamlessly.
 */
export function coilPoint(a: number, length: number, spacing: number, target = new THREE.Vector3()): THREE.Vector3 {
  const p = serpentinePoint(a, length, spacing)
  const phase = (a / COILS.pitch) * TAU
  const c = Math.cos(phase) * COILS.coilRadius
  const z = Math.sin(phase) * COILS.coilRadius
  // N = e3 x T = (-tw, ts) in the plane.
  return target.set(p.s - p.tw * c, p.w + p.ts * c, z)
}

class CoilCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly length: number,
    private readonly spacing: number,
    private readonly a0: number,
    private readonly a1: number,
  ) {
    super()
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    return coilPoint(this.a0 + t * (this.a1 - this.a0), this.length, this.spacing, target)
  }
}

/**
 * The three tiers of one wall's spring (tier 0 = the top run with the first half of the first turn, tier 1 = the
 * middle run with the halves of both turns next to it, tier 2 = the bottom run with the second half of the second
 * turn), in the local frame. They are cut at the middle of each turn, so they join exactly and each tier can fade in on
 * its own material. Turns of the spring follow COILS.pitch.
 */
export function createSerpentineGeometries(length: number, spacing: number): THREE.BufferGeometry[] {
  const run = length - spacing
  const turn = Math.PI * (spacing / 2)
  const bounds = [0, run + turn / 2, 2 * run + 1.5 * turn, serpentineTotal(length, spacing)]
  const geometries: THREE.BufferGeometry[] = []
  for (let i = 0; i < 3; i++) {
    const a0 = bounds[i]
    const a1 = bounds[i + 1]
    const segments = Math.max(8, Math.round(((a1 - a0) / COILS.pitch) * COILS.stepsPerTurn))
    geometries.push(new THREE.TubeGeometry(new CoilCurve(length, spacing, a0, a1), segments, COILS.tubeRadius, COILS.radialSegments, false))
  }
  return geometries
}
