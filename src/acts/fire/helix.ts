import * as THREE from 'three'
import { COILS } from '../../config/fire'

const TAU = Math.PI * 2

/**
 * One heating element in its local frame: x = along the runs (the depth), y = across the runs, z = out of the wall.
 * The spring's centerline is a closed race track in the (x, y) plane, centered on y = 0: run A on y = +height / 2 and run
 * B on y = -height / 2, joined by a half circle of radius height / 2 at the near end (its tip touches x = 0) and the
 * same half circle at the far end (its tip touches x = length). The path starts at the far end of run A heading toward
 * the near end, goes round and ends where it started (same point, same direction).
 */
export interface HairpinPoint {
  s: number
  w: number
  /** Unit tangent in the plane. */
  ts: number
  tw: number
}

/** Total centerline length. */
export function hairpinTotal(length: number, height: number): number {
  return 2 * (length - height) + Math.PI * height
}

/** Extent of the centerline in the local plane. */
export function hairpinBounds(length: number, height: number): { s: [number, number]; w: [number, number] } {
  return { s: [0, length], w: [-height / 2, height / 2] }
}

/** Centerline point and tangent at arclength `a` (clamped to the path). */
export function hairpinPoint(a: number, length: number, height: number): HairpinPoint {
  const r = height / 2
  const run = length - height
  const turn = Math.PI * r
  const t = Math.min(Math.max(a, 0), hairpinTotal(length, height))
  if (t <= run) return { s: length - r - t, w: r, ts: -1, tw: 0 }
  if (t <= run + turn) {
    // Near end, run A to run B, counterclockwise around (r, 0).
    const theta = Math.PI / 2 + (t - run) / r
    return { s: r + r * Math.cos(theta), w: r * Math.sin(theta), ts: -Math.sin(theta), tw: Math.cos(theta) }
  }
  if (t <= 2 * run + turn) return { s: r + (t - run - turn), w: -r, ts: 1, tw: 0 }
  // Far end, run B back to run A, counterclockwise around (length - r, 0).
  const theta = -Math.PI / 2 + (t - 2 * run - turn) / r
  return { s: length - r + r * Math.cos(theta), w: r * Math.sin(theta), ts: -Math.sin(theta), tw: Math.cos(theta) }
}

/** Whole number of coil turns along the closed path (so the helix meets itself at the seam). */
function coilTurns(length: number, height: number): number {
  return Math.max(1, Math.round(hairpinTotal(length, height) / COILS.pitch))
}

/**
 * Point of the spring (the helix around the track) at centerline arclength `a`. The helix offsets the centerline by
 * COILS.coilRadius in the plane normal N = e3 x T and along e3 (out of the wall); the phase runs with the arclength with
 * a whole number of turns over the closed path (pitch = COILS.pitch to within one part in the turn count).
 */
export function coilPoint(a: number, length: number, height: number, target = new THREE.Vector3()): THREE.Vector3 {
  const p = hairpinPoint(a, length, height)
  const phase = (a / hairpinTotal(length, height)) * coilTurns(length, height) * TAU
  const c = Math.cos(phase) * COILS.coilRadius
  const z = Math.sin(phase) * COILS.coilRadius
  // N = e3 x T = (-tw, ts) in the plane.
  return target.set(p.s - p.tw * c, p.w + p.ts * c, z)
}

class CoilCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly length: number,
    private readonly height: number,
  ) {
    super()
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    return coilPoint(t * hairpinTotal(this.length, this.height), this.length, this.height, target)
  }
}

/** The closed spring of one element in the local frame (all elements of a furnace share it). Turns follow COILS.pitch. */
export function createHairpinGeometry(length: number, height: number): THREE.BufferGeometry {
  const segments = Math.max(8, Math.round((hairpinTotal(length, height) / COILS.pitch) * COILS.stepsPerTurn))
  return new THREE.TubeGeometry(new CoilCurve(length, height), segments, COILS.tubeRadius, COILS.radialSegments, true)
}
