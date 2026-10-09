import * as THREE from 'three'
import { mulberry32 } from '../../lib/random'
import type { Box, Vec3 } from '../../scene/ring/normalize'

export interface DrawSegments {
  positions: Float32Array
  reveal: Float32Array
  t: Float32Array
}

/**
 * Per-segment draw order for edge lines: the angle of the segment's midpoint around Z (the finger-hole axis,
 * which faces the camera), starting at the bottom and sweeping counterclockwise, plus a little jitter so the
 * front is not a perfect wipe.
 */
export function edgeRevealAttributes(positions: Float32Array, rand: () => number, jitter = 0.08): { reveal: Float32Array; t: Float32Array } {
  const n = positions.length / 3
  const reveal = new Float32Array(n)
  const t = new Float32Array(n)
  for (let v = 0; v < n; v += 2) {
    const mx = (positions[v * 3] + positions[v * 3 + 3]) / 2
    const my = (positions[v * 3 + 1] + positions[v * 3 + 4]) / 2
    let a = (Math.atan2(my, mx) + Math.PI / 2) / (Math.PI * 2)
    a -= Math.floor(a)
    const r = Math.min(Math.max(a * (1 - jitter) + rand() * jitter, 0), 1)
    reveal[v] = r
    reveal[v + 1] = r
    t[v] = 0
    t[v + 1] = 1
  }
  return { reveal, t }
}

export interface DimensionOptions {
  /** Distance from the ring to the dimension line. */
  gap?: number
  /** How far extension lines run past the dimension line. */
  overshoot?: number
  /** Half size of the slash ticks. */
  tick?: number
}

const DEFAULTS: Required<DimensionOptions> = { gap: 0.12, overshoot: 0.04, tick: 0.025 }

export function dimensionAnchors(box: Box, opts: DimensionOptions = {}): { height: Vec3; width: Vec3 } {
  const { gap } = { ...DEFAULTS, ...opts }
  const z = box.max[2]
  return {
    height: [box.max[0] + gap, (box.min[1] + box.max[1]) / 2, z],
    width: [(box.min[0] + box.max[0]) / 2, box.min[1] - gap, z],
  }
}

/** Blueprint dimension lines for height (right of the ring) and width (under it), on the ring's front plane. */
export function dimensionSegments(box: Box, opts: DimensionOptions = {}): DrawSegments {
  const { gap, overshoot, tick } = { ...DEFAULTS, ...opts }
  const z = box.max[2]
  const [x0, y0] = [box.min[0], box.min[1]]
  const [x1, y1] = [box.max[0], box.max[1]]
  const hx = x1 + gap
  const wy = y0 - gap
  const lift = 0.02
  // [ax, ay, bx, by, reveal]
  const segs: [number, number, number, number, number][] = [
    // Height: extension lines, main line, ticks.
    [x1 + lift, y1, hx + overshoot, y1, 0],
    [x1 + lift, y0, hx + overshoot, y0, 0],
    [hx, y0, hx, y1, 0.2],
    [hx - tick, y1 - tick, hx + tick, y1 + tick, 0.6],
    [hx - tick, y0 - tick, hx + tick, y0 + tick, 0.6],
    // Width.
    [x0, y0 - lift, x0, wy - overshoot, 0],
    [x1, y0 - lift, x1, wy - overshoot, 0],
    [x0, wy, x1, wy, 0.2],
    [x0 - tick, wy - tick, x0 + tick, wy + tick, 0.6],
    [x1 - tick, wy - tick, x1 + tick, wy + tick, 0.6],
  ]
  const positions = new Float32Array(segs.length * 6)
  const reveal = new Float32Array(segs.length * 2)
  const t = new Float32Array(segs.length * 2)
  segs.forEach(([ax, ay, bx, by, r], i) => {
    positions.set([ax, ay, z, bx, by, z], i * 6)
    reveal[i * 2] = r
    reveal[i * 2 + 1] = r
    t[i * 2 + 1] = 1
  })
  return { positions, reveal, t }
}

export function toLineGeometry(seg: DrawSegments): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(seg.positions, 3))
  g.setAttribute('aReveal', new THREE.BufferAttribute(seg.reveal, 1))
  g.setAttribute('aT', new THREE.BufferAttribute(seg.t, 1))
  g.computeBoundingSphere()
  return g
}

/**
 * The sprue mark is a long straight segment lying wholly under this height (ring height 1, y from -0.5 to 0.5).
 * Short segments there are pieces of the curved outline of the bands and must stay.
 */
export const BOTTOM_MARK = { y: -0.465, minLength: 0.05 } as const

/**
 * Drops the long straight segments (pairs of vertices) that lie wholly on the very bottom of the ring: the mark under
 * the shank that the CAD model has where the sprue attaches. It is a model artifact, not an edge of the design.
 */
export function dropBottomMark(positions: Float32Array): Float32Array {
  const kept: number[] = []
  for (let v = 0; v + 1 < positions.length / 3; v += 2) {
    const ya = positions[v * 3 + 1]
    const yb = positions[v * 3 + 4]
    const length = Math.hypot(
      positions[v * 3] - positions[v * 3 + 3],
      ya - yb,
      positions[v * 3 + 2] - positions[v * 3 + 5],
    )
    if (ya < BOTTOM_MARK.y && yb < BOTTOM_MARK.y && length > BOTTOM_MARK.minLength) continue
    for (let k = 0; k < 6; k++) kept.push(positions[v * 3 + k])
  }
  return new Float32Array(kept)
}

/** Feature edges of the ring (creases sharper than thresholdDeg) with draw-order attributes. */
export function buildEdgeGeometry(ring: THREE.BufferGeometry, thresholdDeg = 30, seed = 7): THREE.BufferGeometry {
  const edges = new THREE.EdgesGeometry(ring, thresholdDeg)
  const positions = dropBottomMark(edges.getAttribute('position').array as Float32Array)
  const { reveal, t } = edgeRevealAttributes(positions, mulberry32(seed))
  edges.dispose()
  return toLineGeometry({ positions: new Float32Array(positions), reveal, t })
}
