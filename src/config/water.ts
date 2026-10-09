import * as THREE from 'three'
import { BURN, FLIP } from './fire'
import { CAM, MOLD } from './mold'

/** Flange (skirt) radius of the flask: FLANGE_RADIUS in acts/mold/flaskMaterial.ts (pinned by water.test.ts). */
export const FLASK_FLANGE_RADIUS = 1.98
/** Outer tube radius of the flask: FLASK_RADIUS in acts/mold/flaskMaterial.ts (pinned by water.test.ts). */
export const FLASK_TUBE_RADIUS = 1.38

/**
 * The blue plastic bucket (Act 6) in world space, centred on the flask axis: rim at `rimY` with a rolled `lip`, a
 * straight taper from `topRadius` to `bottomRadius`, a `wall` thick shell with a floor. `dropOffset` = start
 * position, fully below the frame. Big enough for the flask lying on its side (fit tests in water.test.ts).
 * Shapes for the author to correct.
 */
export const BUCKET = { topRadius: 3.7, bottomRadius: 3.25, wall: 0.1, lip: 0.14, rimY: -1.9, bottomY: -7.4, dropOffset: -12 } as const

/** World Y of the water surface inside the bucket. */
export const WATER_Y = -2.4

/** story.flask.flip value of the flask lying on its side, the foot (funnel) end to the right (+X), away from the copy. */
export const SIDE_FLIP = 0.5

/** World Y of the lying flask's axis when it is under the water: the flange clears the surface by 0.25. */
const DIPPED_AXIS_Y = WATER_Y - FLASK_FLANGE_RADIUS - 0.25
/** How far the flask goes down into the bucket (story.flask.dip = 1). */
export const DIP_DEPTH = FLIP.pivotY - DIPPED_AXIS_Y

/** The flask and the bucket recede `back` and sink `sink` (out of the frame) at story.flask.away = 1. */
export const AWAY = { back: 7, sink: 9 } as const

/** The tree in the unflipped flask frame: from the funnel mouth (flask bottom) up to above the highest ring corner. */
export const TREE_SPAN = { bottomY: MOLD.flask.bottomY, topY: BURN.topY } as const

/** The open end of the flask on the funnel side: the end of its foot. */
export const FOOT_END_Y = MOLD.flask.bottomY - MOLD.foot.height

/** How far the tree slides out along the flask axis, funnel first, until its top is clear of the foot end. */
export const SLIDE = TREE_SPAN.topY - FOOT_END_Y + 0.3

/** The raw tree's final pose: upright (funnel up), its middle at (0, y, z), in front of where the flask was. */
export const RAW = { y: CAM.tree.look, z: 2.5, yawTo: Math.PI / 3 } as const

/** Camera targets (same shape as CAM in config/mold.ts). `bucket`: side, a bit above, the whole bucket in frame. */
export const CAM_WATER = {
  bucket: { y: 2.6, z: 24, look: -2.8 },
  raw: { ...CAM.tree },
} as const

/** The water timer runs 00:00 to 10:00 (the author: ten minutes in the white water). */
export const WATER_REST_SECONDS = 600

/** World offset of the flask rig on top of the act 3 drop: down into the bucket, then back and down out of the frame. */
export function flaskOffset(f: { dip: number; away: number }): { y: number; z: number } {
  return { y: -f.dip * DIP_DEPTH - f.away * AWAY.sink, z: -f.away * AWAY.back }
}

/** World offset of the bucket: up from below the frame (bucket 0..1), then away together with the flask. */
export function bucketOffset(bucket: number, away: number): { y: number; z: number } {
  // `0 -` and `+` keep the resting offset +0 (not -0), so it compares equal to { y: 0, z: 0 }.
  return { y: (1 - bucket) * BUCKET.dropOffset + (0 - away * AWAY.sink), z: 0 - away * AWAY.back }
}

/** Inner radius of the bucket at world height y (straight taper). */
export function bucketInnerRadius(y: number): number {
  const t = (y - BUCKET.bottomY) / (BUCKET.rimY - BUCKET.bottomY)
  return BUCKET.bottomRadius - BUCKET.wall + t * (BUCKET.topRadius - BUCKET.bottomRadius)
}

/** Lathe profile (x = radius, y = world height) of the bucket: floor, outer wall, rolled lip, inner wall, inner floor. */
export function bucketProfile(): [number, number][] {
  const { topRadius: rt, bottomRadius: rb, wall, lip, rimY, bottomY } = BUCKET
  return [
    [0, bottomY],
    [rb, bottomY],
    [rt, rimY - lip],
    [rt + lip * 0.6, rimY - lip],
    [rt + lip * 0.6, rimY],
    [rt - wall, rimY],
    [rb - wall, bottomY + wall],
    [0, bottomY + wall],
  ]
}

const mA = new THREE.Matrix4()
const mB = new THREE.Matrix4()
const pA = new THREE.Vector3()
const pB = new THREE.Vector3()
const qA = new THREE.Quaternion()
const qB = new THREE.Quaternion()
const sA = new THREE.Vector3()
const ONE = new THREE.Vector3(1, 1, 1)

/**
 * World matrix of the flask frame (the unflipped flask-local space the flask, the investment and the tree are built
 * in): the rig offset, then the flip about FLIP.pivotY. Mirrors MoldScene (rig -> flipper -> -pivot).
 */
export function flaskMatrix(f: { dip: number; away: number; flip: number }, out: THREE.Matrix4): THREE.Matrix4 {
  const o = flaskOffset(f)
  out.makeTranslation(0, o.y + FLIP.pivotY, o.z)
  out.multiply(mA.makeRotationZ(f.flip * Math.PI))
  return out.multiply(mA.makeTranslation(0, -FLIP.pivotY, 0))
}

/** World matrix of the standing raw tree: funnel up (Rz(PI)), turned by `yaw` about Y, its middle at RAW. */
export function finalTreeMatrix(yaw: number, out: THREE.Matrix4): THREE.Matrix4 {
  const mid = (TREE_SPAN.bottomY + TREE_SPAN.topY) / 2
  out.makeTranslation(0, RAW.y, RAW.z)
  out.multiply(mA.makeRotationY(yaw))
  out.multiply(mA.makeRotationZ(Math.PI))
  return out.multiply(mA.makeTranslation(0, -mid, 0))
}

/**
 * World matrix of the raw tree: in the flask frame (ignoring `away`: the tree has left the flask before it goes),
 * slid `slide * SLIDE` along the flask axis toward the funnel end (local -Y), then blended (smoothstep of `stand`:
 * position lerp, rotation slerp) into finalTreeMatrix(yaw).
 */
export function rawTreeMatrix(f: { dip: number; flip: number; away?: number }, w: { slide: number; stand: number; yaw: number }, out: THREE.Matrix4): THREE.Matrix4 {
  flaskMatrix({ dip: f.dip, flip: f.flip, away: 0 }, out)
  out.multiply(mB.makeTranslation(0, -w.slide * SLIDE, 0))
  if (w.stand <= 0) return out
  out.decompose(pA, qA, sA)
  finalTreeMatrix(w.yaw, mB).decompose(pB, qB, sA)
  const t = Math.min(w.stand, 1)
  const k = t * t * (3 - 2 * t)
  pA.lerp(pB, k)
  qA.slerp(qB, k)
  return out.compose(pA, qA, ONE)
}
