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
export const JAR = { radius: 1.65, wall: 0.06, height: 2.4, rimY: -2.1, dropOffset: -10, sink: 9 } as const
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

/** Half thickness of a ring lying flat (its hole axis vertical): the rounded box half plus 0.002 (the mesh is 0.001 thicker). */
const LIE_HALF = RING_HALF_EXTENTS.z + 0.002
/** A rest pose from polar values: centre `d` from the jar axis at world azimuth `az` (deg, atan2(z, x)), stub toward `stub` (deg, same convention). */
const lying = (d: number, az: number, level: number, stub: number) => ({
  x: d * Math.cos(deg(az)),
  z: d * Math.sin(deg(az)),
  level,
  yaw: deg(90 - stub), // restMatrix turns the stub (ring-local -Y) to (sin yaw, 0, cos yaw)
})

/**
 * Rest poses in the jar per slot: offset from the jar axis, stack level, turn about Y. Rings 1-3 lie flat on the floor
 * near the side they hung on (1 left, 2 front, 3 back), apart from each other, stubs out toward the wall (clear of it),
 * so their thick signet plates point in, under the hero ring. The hero ring lies flat on top across all three, its
 * thin shank and stub over the open side (right, where it hung), its centre inside their contacts so it would not tip.
 * Pinned by birthCollide.test.ts (no overlaps, inside the jar under the acid, every ring supported).
 */
export const JAR_REST: readonly { x: number; z: number; level: number; yaw: number }[] = [
  lying(0.04, 180, 1, -15),
  lying(0.76, 168, 0, 180),
  lying(0.74, 60, 0, 75),
  lying(0.77, -95, 0, -110),
]

/**
 * Fall shape. The cut ring first slides `pull` straight out from the trunk (horizontal, along its branch) during the
 * first `pullTo` of the cut, which clears the rings still hanging on the tree; then it drops (height t^2 like gravity).
 * It keeps its hanging pose until its centre passes `turnHi` (relative to the jar rim, below the lowest ring still on
 * the tree) and turns flat and moves over its rest spot by `turnLo` (above the rings already lying in the jar), with a
 * little extra turn about Y (`spin`, radians at the middle of the turn).
 */
export const FALL = { pull: 0.6, pullTo: 0.25, turnHi: 0.55, turnLo: -1.2, spin: 0.5 } as const

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

/**
 * Final frame: ring tilt, ambient spin speed (rad/s at birth.finale = 1), the reflection plane under the ring, and
 * `roughness`: the polished gold softens to this in the final (broad highlights instead of a black mirror), `envBoost`: the polished gold's IBL is scaled up to this factor with birth.finale (the brighter "render" look).
 * mirrorY: the ring body's lowest point at `tilt` is 0.5117 under its centre (measured on ring.glb, stub excluded); the
 * plane at -0.646 leaves a 0.134 gap (half of the s07 gap 0.268 at -0.78). The reflection fades to black from
 * `reflectStrength` at the plane to 0 at `reflectFade` under it (polishMaterial.ts).
 */
export const FINAL = {
  tilt: deg(10),
  spin: 0.35,
  mirrorY: RAW.y - 0.646,
  reflectStrength: 0.32,
  reflectFade: 0.9,
  envBoost: 2.6,
  roughness: 0.3,
} as const

/**
 * The real lights of the final frame (world space, relative to POLISH): a warm key upper right in front of the ring,
 * a warm fill front left (about 40% of the key, so no spin angle shows only the dark environment) and a faint cool
 * rim behind it. Mounted from the start at intensity 0 (a changed light count recompiles every shader) and scaled
 * 0..intensity by birth.finale. Point lights, candela, decay 2. Tune by eye.
 */
export const FINAL_LIGHT = {
  key: { position: [POLISH.x + 1.6, POLISH.y + 1.7, POLISH.z + 2.3] as const, color: '#ffd8a6', intensity: 70 },
  fill: { position: [POLISH.x - 1.8, POLISH.y + 0.6, POLISH.z + 2.0] as const, color: '#ffe0b8', intensity: 28 },
  rim: { position: [POLISH.x - 1.5, POLISH.y + 0.9, POLISH.z - 1.9] as const, color: '#a8c6ff', intensity: 24 },
} as const

/**
 * The page-wide wipe after the polish (screen space). The line goes from the end of its pass to a vertical line at
 * NDC x = leftX (rotating up and growing to `half`, in half-viewport-heights), then sweeps to NDC x = rightX (off the
 * right edge, glow included). `width` is its full thickness at the left edge (half-viewport-heights; the 3D line is
 * about 0.024 in the polish view), `glow` the soft halo it gains on the way.
 */
export const WIPE = { leftX: -0.985, rightX: 1.08, half: 1.25, width: 0.016, glow: 0.35 } as const

/** Camera targets (same shape as CAM in config/mold.ts). Tune by eye; framing pinned by birth.test.ts. */
export const CAM_BIRTH = {
  /** The standing tree and the whole jar under it. */
  jar: { y: -0.4, z: RAW.z + 16.5, look: -1.2 },
  /** Close on the ring in the centre for the polish line. */
  polish: { y: RAW.y, z: RAW.z + 4.6, look: RAW.y },
  /** Final: a little higher, looking down, so the reflection shows under the ring; about 19% larger than the s07 draft. */
  final: { y: RAW.y + 0.3, z: RAW.z + 5.4, look: RAW.y - 0.45 },
} as const
/** Act 7 starts from the act 6 end camera. */
export const CAM_BIRTH_START = CAM_WATER.raw

/** World Y of the centre of a flat ring at stack `level` (jar in place): on the floor, then 0.02 apart. */
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

const OUT = new THREE.Vector3()

/**
 * Ring-local -> world of a cut ring (FALL): on the tree at cut 0; slides straight out from the trunk; drops (height
 * t^2 like gravity) in its hanging pose past the rings still on the tree; turns flat over its rest spot (a little spin
 * about Y) above the rings already in the jar; at rest in the jar at cut 1. Exact at both ends.
 */
export function cutRingMatrix(slot: number, cut: number, jarY: number, out: THREE.Matrix4): THREE.Matrix4 {
  slotMatrix(slot, out)
  if (cut <= 0) return out
  const t = Math.min(cut, 1)
  out.decompose(pA, qA, sA)
  restMatrix(slot, jarY, mB).decompose(pB, qB, sA)
  // Out from the trunk: the ring-local +Y (from the sprue tip to the ring) laid flat.
  OUT.set(0, 1, 0).applyQuaternion(qA).setY(0).normalize()
  pA.addScaledVector(OUT, FALL.pull * smooth(t / FALL.pullTo))
  const s = Math.max(t - FALL.pullTo, 0) / (1 - FALL.pullTo)
  const y = pA.y + (pB.y - pA.y) * s * s
  const hi = JAR.rimY + jarY + FALL.turnHi
  const k = smooth((hi - y) / (hi - (JAR.rimY + jarY + FALL.turnLo)))
  pA.set(pA.x + (pB.x - pA.x) * k, y, pA.z + (pB.z - pA.z) * k)
  qA.slerp(qB, k)
  qS.setFromAxisAngle(Y, FALL.spin * 4 * k * (1 - k))
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
