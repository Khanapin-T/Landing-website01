import * as THREE from 'three'
import { RING_HALF_EXTENTS, slotPose } from '../scene/tree/slots'
import { PRINT, RING_HALF } from './print'
import { CAM_WATER, RAW, finalTreeMatrix } from './water'

const deg = (d: number) => (d * Math.PI) / 180

/**
 * The low glass jar of pale-green acid (Act 7), centred under the standing tree (x = 0, z = RAW.z): about as wide as
 * the flask, no taller than its diameter (the author). `dropOffset` = start offset below the frame, `sink` = how far
 * it goes down at the end. Shapes for the author to correct.
 */
export const JAR = { radius: 1.5, wall: 0.06, height: 2.4, rimY: -2.1, dropOffset: -10, sink: 9 } as const
export const JAR_FLOOR_Y = JAR.rimY - JAR.height
/** World Y of the acid surface (jar in place). */
export const ACID_Y = JAR.rimY - 0.3
/** The acid timer runs 00:00 to 10:00 (the author: ten minutes in the acid). */
export const BIRTH_REST_SECONDS = 600

/** The ring the act polishes: slot 0 (the hero ring). It is cut last, so it lies on top and is the one taken out. */
export const HERO_SLOT = 0
/** Order of the cuts (slots). */
export const CUT_ORDER = [1, 2, 3, HERO_SLOT] as const
/** How far the empty tree goes up (world units) at birth.treeUp = 1: out of the frame. */
export const TREE_UP = 9

/** Half thickness of a ring lying flat (its hole axis vertical). */
const LIE_HALF = RING_HALF_EXTENTS.z
/** Rest poses in the jar per slot: offset from the jar axis, stack level, turn about Y (stubs point outward). */
export const JAR_REST: readonly { x: number; z: number; level: number; yaw: number }[] = [
  { x: 0.05, z: -0.05, level: 2, yaw: 0.4 },
  { x: -0.5, z: 0, level: 0, yaw: -Math.PI / 2 },
  { x: 0.5, z: 0, level: 0, yaw: Math.PI / 2 },
  { x: 0, z: 0.05, level: 1, yaw: Math.PI },
]

/** Fall shape: the sideways move is done by `xzTo` of the fall (before the rim), `spin` = the little extra turn about Y. */
export const FALL = { xzTo: 0.6, spin: 0.7 } as const

/** Centre of the ring while it is polished and in the final frame (where the tree stood). */
export const POLISH = { x: 0, y: RAW.y, z: RAW.z } as const
/** How far the ring turns (to the right, +Y) while the line passes. */
export const POLISH_TURN = 0.9

/**
 * The neon polish line, relative to POLISH: `angle` from the horizontal, it moves from fromX to toX (right to left)
 * at `zFront` in front of the ring centre. `length` holds the whole ring, `width` is its thickness.
 */
export const LINE = { angle: deg(65), length: 1.7, width: 0.028, fromX: 1.05, toX: -1.05, zFront: 0.3 } as const
/** Unit direction along the line (up and to the right). */
export const LINE_DIR = new THREE.Vector3(Math.cos(LINE.angle), Math.sin(LINE.angle), 0)
/** Unit normal of the split plane (contains the line and the view axis), pointing right: the polished side. */
export const LINE_NORMAL = new THREE.Vector3(Math.sin(LINE.angle), -Math.cos(LINE.angle), 0)

/** Final frame: ring tilt, ambient spin speed (rad/s at birth.finale = 1), the reflection plane under the ring. */
export const FINAL = { tilt: deg(10), spin: 0.35, mirrorY: RAW.y - 0.78 } as const

/** Camera targets (same shape as CAM in config/mold.ts). Tune by eye; framing pinned by birth.test.ts. */
export const CAM_BIRTH = {
  /** The standing tree and the whole jar under it. */
  jar: { y: -0.4, z: RAW.z + 16.5, look: -1.2 },
  /** Close on the ring in the centre for the polish line. */
  polish: { y: RAW.y, z: RAW.z + 4.6, look: RAW.y },
  /** Final: a little higher and further, so the reflection shows under the ring. */
  final: { y: RAW.y + 0.4, z: RAW.z + 6.4, look: RAW.y - 0.45 },
} as const
/** Act 7 starts from the act 6 end camera. */
export const CAM_BIRTH_START = CAM_WATER.raw

export const restY = (level: number) => JAR_FLOOR_Y + JAR.wall + LIE_HALF + level * (2 * LIE_HALF + 0.02)

/** World Y offset of the jar: up from below the frame (jar 0..1), then down out of it (away 0..1). */
export function jarOffsetY(jar: number, away: number): number {
  return (1 - jar) * JAR.dropOffset - away * JAR.sink + 0 // + 0 turns a -0 into +0
}

/** Lathe profile (x = radius, y = world height) of the jar: floor, outer wall, rim, inner wall, inner floor. */
export function jarProfile(): [number, number][] {
  const { radius: r, wall, rimY } = JAR
  return [
    [0, JAR_FLOOR_Y],
    [r, JAR_FLOOR_Y],
    [r, rimY],
    [r - wall, rimY],
    [r - wall, JAR_FLOOR_Y + wall],
    [0, JAR_FLOOR_Y + wall],
  ]
}

const mA = new THREE.Matrix4()
const mB = new THREE.Matrix4()
const pA = new THREE.Vector3()
const pB = new THREE.Vector3()
const qA = new THREE.Quaternion()
const qB = new THREE.Quaternion()
const qS = new THREE.Quaternion()
const sA = new THREE.Vector3()
const ONE = new THREE.Vector3(1, 1, 1)
const Y = new THREE.Vector3(0, 1, 0)
const TREE_M = finalTreeMatrix(RAW.yawTo, new THREE.Matrix4())
const POSE = slotPose(0)

const smooth = (t: number) => {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

/** World matrix of the empty tree: the act 6 end pose, lifted by up * TREE_UP. */
export function treeMatrix(up: number, out: THREE.Matrix4): THREE.Matrix4 {
  return out.makeTranslation(0, up * TREE_UP, 0).multiply(TREE_M)
}

/** Ring-local -> world of slot `slot` on the standing tree (act 6 end pose). */
export function slotMatrix(slot: number, out: THREE.Matrix4): THREE.Matrix4 {
  slotPose(slot, POSE)
  return out.copy(TREE_M).multiply(mA.compose(POSE.position, POSE.quaternion, ONE))
}

/** Ring-local -> world of slot `slot` lying in the jar (hole axis vertical), the jar raised by `jarY`. */
export function restMatrix(slot: number, jarY: number, out: THREE.Matrix4): THREE.Matrix4 {
  const r = JAR_REST[slot]
  out.makeTranslation(r.x, restY(r.level) + jarY, RAW.z + r.z)
  out.multiply(mA.makeRotationY(r.yaw))
  return out.multiply(mA.makeRotationX(-Math.PI / 2))
}

/**
 * Ring-local -> world of a cut ring: on the tree at cut 0, falling (sideways move done by FALL.xzTo, height t^2 like
 * gravity, a little spin about Y), at rest in the jar at cut 1. Exact at both ends.
 */
export function cutRingMatrix(slot: number, cut: number, jarY: number, out: THREE.Matrix4): THREE.Matrix4 {
  slotMatrix(slot, out)
  if (cut <= 0) return out
  const t = Math.min(cut, 1)
  out.decompose(pA, qA, sA)
  restMatrix(slot, jarY, mB).decompose(pB, qB, sA)
  const kxz = smooth(t / FALL.xzTo)
  pA.set(pA.x + (pB.x - pA.x) * kxz, pA.y + (pB.y - pA.y) * t * t, pA.z + (pB.z - pA.z) * kxz)
  qA.slerp(qB, smooth(t))
  qS.setFromAxisAngle(Y, FALL.spin * 4 * t * (1 - t))
  qA.premultiply(qS)
  return out.compose(pA, qA, ONE)
}

/** Ring-local -> world of the ring in the centre: turned `yaw` about Y, tilted `tilt` toward the camera. */
export function polishMatrix(yaw: number, tilt: number, out: THREE.Matrix4): THREE.Matrix4 {
  out.makeTranslation(POLISH.x, POLISH.y, POLISH.z)
  out.multiply(mA.makeRotationY(yaw))
  return out.multiply(mA.makeRotationX(tilt))
}

/**
 * The hero ring from the tree to the final frame: its cut pose (jar in place, never `away`: it leaves before the jar
 * goes), then blended (smoothstep of `out`) into polishMatrix(yaw, tilt).
 */
export function heroMatrix(h: { cut: number; jar: number; out: number; yaw: number; tilt: number }, out: THREE.Matrix4): THREE.Matrix4 {
  cutRingMatrix(HERO_SLOT, h.cut, jarOffsetY(h.jar, 0), out)
  if (h.out <= 0) return out
  const k = smooth(h.out)
  out.decompose(pA, qA, sA)
  polishMatrix(h.yaw, h.tilt, mB).decompose(pB, qB, sA)
  pA.lerp(pB, k)
  qA.slerp(qB, k)
  return out.compose(pA, qA, ONE)
}

/** The reflection: `src` mirrored in the horizontal plane y = FINAL.mirrorY. */
export function mirrorMatrix(src: THREE.Matrix4, out: THREE.Matrix4): THREE.Matrix4 {
  out.makeTranslation(0, 2 * FINAL.mirrorY, 0)
  out.multiply(mA.makeScale(1, -1, 1))
  return out.multiply(src)
}

/** World point on the line at progress `line` (0 = right start, 1 = left end), at the ring centre height. */
export function polishLinePoint(line: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(POLISH.x + LINE.fromX + (LINE.toX - LINE.fromX) * line, POLISH.y, POLISH.z + LINE.zFront)
}

const STUB_TIP = new THREE.Vector3(0, -(RING_HALF + PRINT.sprue.length), 0)

/** The ring's bounding-box corners and its stub tip in world space, for fit and framing checks. */
export function ringPoints(m: THREE.Matrix4): THREE.Vector3[] {
  const out: THREE.Vector3[] = [STUB_TIP.clone().applyMatrix4(m)]
  const h = RING_HALF_EXTENTS
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) out.push(new THREE.Vector3(sx * h.x, sy * h.y, sz * h.z).applyMatrix4(m))
  return out
}
