import * as THREE from 'three'
import { MOLD } from '../../config/mold'

const TAU = Math.PI * 2

/** Outer surface of the steel tube. */
export const FLASK_RADIUS = MOLD.flask.innerRadius + MOLD.flask.wall
/** Inner surface of the steel tube (seen through the top opening and through the holes). */
export const FLASK_INNER_RADIUS = MOLD.flask.innerRadius

/**
 * Perforation (after the reference flask): round holes, HOLE_COLUMNS around each row, HOLE_ROWS rows, every other
 * row shifted by half a column (staggered, nearly hexagonal). Each hole is a straight radial bore through the wall.
 */
export const HOLE_COLUMNS = 5
export const HOLE_ROWS = 7
/** Bore radius in world units. */
export const HOLE_RADIUS = 0.16
/**
 * Plain steel left below the first row cell (foot, flange, neck plus about one centimetre) and above the last one
 * (rim), world units.
 */
export const HOLE_BAND = { bottom: 0.82, top: 0.18 } as const
/** Object-space azimuth of the first row's column 0 (facing the camera at rest, see the azimuth convention). */
export const HOLE_AZIMUTH0 = -Math.PI / 2
/** Thin bright highlight on the steel just outside each cut, world units (about 1.5 px on screen). */
export const HOLE_EDGE = { edge: 0.012 } as const
/** Sides of each bore tube. */
export const BORE_SEGMENTS = 24
/** Bore tubes poke this far past both wall surfaces so no crack shows at the cut. */
const BORE_OVERSHOOT = 0.002

/**
 * Bottom of the flask (after the reference photos): a wide flat flange plate with chamfered edges on the flask
 * bottom (MOLD.flask.bottomY) with a small neck where the tube meets it, and under the plate the foot: a plain
 * steel tube of the same radii as the perforated part (it stands in the rubber cup), hanging FOOT.height below the
 * flask bottom, with a small chamfer on its lower outer rim. World units.
 */
export const FOOT = { height: MOLD.foot.height, chamfer: 0.02 } as const
export const FLANGE = { height: 0.16, overhang: 0.6, chamferTop: 0.05, chamferBottom: 0.025 } as const
export const NECK = { height: 0.07, overhang: 0.035, chamfer: 0.025 } as const
export const FLANGE_RADIUS = FLASK_RADIUS + FLANGE.overhang
/** The foot is the same tube as the perforated part. */
export const FOOT_RADIUS = FLASK_RADIUS
/** Flat top rim between the two wall surfaces, with rolled edges of this radius. */
export const RIM = { round: 0.02 } as const
/**
 * Both shell surfaces in flask-local space (y = 0 at the middle of the flask): from the flask bottom up to where the
 * rolled rim edges start.
 */
export const SHELL = (() => {
  const bottom = -MOLD.flask.height / 2
  const top = MOLD.flask.height / 2 - RIM.round
  return { bottom, top, height: top - bottom, center: (top + bottom) / 2 } as const
})()
/**
 * The inner surface runs on down through the foot to its bottom (same flask-local space): one continuous bore with
 * one shade; no holes are cut below the hole band.
 */
export const INNER_SHELL = (() => {
  const bottom = SHELL.bottom - FOOT.height
  const top = SHELL.top
  return { bottom, top, height: top - bottom, center: (top + bottom) / 2 } as const
})()

/** Quarter-circle steps of the rounded profile edges. */
const ARC_STEPS = 4

/** Brushed stainless steel. */
export const STEEL = { color: '#d2d9e0', roughness: 0.42, envMapIntensity: 3.2 } as const
/**
 * Brushing: value noise stretched around the circumference. `fine` / `coarse` = streak frequency per world unit
 * along the height (and along the radius on flat faces), `cellsFine` / `cellsCoarse` = noise cells around the
 * circumference, `roughness` / `tint` = swing of the roughness and of the brightness.
 */
export const BRUSH = { fine: 160, coarse: 42, cellsFine: 36, cellsCoarse: 13, roughness: 0.07, tint: 0.07 } as const

const ROW_PITCH = (MOLD.flask.height - HOLE_BAND.bottom - HOLE_BAND.top) / HOLE_ROWS

/**
 * Signed distance (world units) from a wall point to the nearest bore wall: negative inside a hole. Each bore is a
 * straight radial cylinder, so the distance is measured to its axis (height offset and `radius * sin` of the azimuth
 * offset), which cuts the same cross-section on the outer and the inner surface. `y` = flask-local height (0 at the
 * middle of the flask), `azimuth` = atan2(-z, x), `radius` = distance of the point from the flask axis. The fragment
 * shader mirrors this function exactly.
 */
export function flaskHoleDistance(y: number, azimuth: number, radius: number = FLASK_RADIUS): number {
  const rowCoord = (y + MOLD.flask.height / 2 - HOLE_BAND.bottom) / ROW_PITCH - 0.5
  const r0 = Math.floor(rowCoord)
  const colBase = ((azimuth - HOLE_AZIMUTH0) / TAU) * HOLE_COLUMNS
  let best = 1e3
  for (let i = 0; i < 2; i++) {
    const r = r0 + i
    if (r < 0 || r > HOLE_ROWS - 1) continue
    const c = colBase - 0.5 * (r % 2)
    const dx = radius * Math.sin(((c - Math.floor(c + 0.5)) * TAU) / HOLE_COLUMNS)
    const dy = (rowCoord - r) * ROW_PITCH
    best = Math.min(best, Math.hypot(dx, dy))
  }
  return best - HOLE_RADIUS
}

/** Every hole center as (flask-local y, azimuth), row by row. */
export function holeCenters(): { y: number; azimuth: number }[] {
  const out: { y: number; azimuth: number }[] = []
  for (let r = 0; r < HOLE_ROWS; r++) {
    const y = -MOLD.flask.height / 2 + HOLE_BAND.bottom + (r + 0.5) * ROW_PITCH
    for (let c = 0; c < HOLE_COLUMNS; c++) {
      const a = HOLE_AZIMUTH0 + ((c + 0.5 * (r % 2)) / HOLE_COLUMNS) * TAU
      out.push({ y, azimuth: Math.atan2(Math.sin(a), Math.cos(a)) })
    }
  }
  return out
}

/**
 * Lathe profiles below (x = radius, y = height) all run outward along the bottom, up the outer side, inward across
 * the top and down the inner side: that order gives outward-facing normals and triangles in LatheGeometry. A corner
 * point given twice puts a zero-length segment between its faces, so each keeps its own normal (hard edge); arc
 * points are given once (smooth rounded edge).
 */
type Profile = [number, number][]

function profileBuilder() {
  const pts: Profile = []
  const soft = (x: number, y: number) => {
    pts.push([x, y])
  }
  const hard = (x: number, y: number) => {
    pts.push([x, y], [x, y])
  }
  /** Quarter-ish arc of radius r around (cx, cy) from angle a0 to a1, both ends included. */
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
    for (let i = 0; i <= ARC_STEPS; i++) {
      const a = a0 + ((a1 - a0) * i) / ARC_STEPS
      soft(cx + r * Math.cos(a), cy + r * Math.sin(a))
    }
  }
  return { pts, soft, hard, arc }
}

/**
 * Flange plate and neck (y in the Flask group, plate underside on MOLD.flask.bottomY): outward along the plate
 * underside, up the chamfered plate edge, inward across the plate top, up the neck and its chamfer onto the tube,
 * then down the inner face, which stays inside the wall.
 */
export function flangeProfile(): Profile {
  const { pts, hard } = profileBuilder()
  const ri = FLASK_RADIUS - 0.004
  const rn = FLASK_RADIUS + NECK.overhang
  const y0 = MOLD.flask.bottomY
  const y1 = y0 + FLANGE.height
  const yn = y1 + NECK.height
  pts.push([ri, y0])
  hard(FLANGE_RADIUS - FLANGE.chamferBottom, y0)
  hard(FLANGE_RADIUS, y0 + FLANGE.chamferBottom)
  hard(FLANGE_RADIUS, y1 - FLANGE.chamferTop)
  hard(FLANGE_RADIUS - FLANGE.chamferTop, y1)
  hard(rn, y1)
  hard(rn, yn - NECK.chamfer)
  hard(FLASK_RADIUS, yn)
  hard(ri, yn)
  pts.push([ri, y0])
  return pts
}

/**
 * Top rim (y in the Flask group): a flat annulus between the outer and the inner wall surface with rolled edges,
 * from where the outer shell stops, over the top, down to where the inner shell stops.
 */
export function rimProfile(): Profile {
  const { pts, arc } = profileBuilder()
  const ys = MOLD.flask.bottomY + MOLD.flask.height / 2 + SHELL.top
  arc(FLASK_RADIUS - RIM.round, ys, RIM.round, 0, Math.PI / 2)
  arc(FLASK_INNER_RADIUS + RIM.round, ys, RIM.round, Math.PI / 2, Math.PI)
  return pts
}

/**
 * Foot (y in the Flask group): the plain steel tube under the flange, from the bottom ring (from the inner surface
 * outward, where INNER_SHELL carries the bore wall down) over the chamfered lower rim and straight up the outside to
 * the plate underside on MOLD.flask.bottomY.
 */
export function footProfile(): Profile {
  const { pts, hard } = profileBuilder()
  const top = MOLD.flask.bottomY
  const bottom = top - FOOT.height
  pts.push([FLASK_INNER_RADIUS, bottom])
  hard(FOOT_RADIUS - FOOT.chamfer, bottom)
  hard(FOOT_RADIUS, bottom + FOOT.chamfer)
  pts.push([FOOT_RADIUS, top])
  return pts
}

/**
 * Black rubber cup around the flask foot (world y, top face on MOLD.baseTopY, MOLD.base.gap under the flange
 * underside): rounded outer edges, a bore `clearance` wider than the foot down to a thin floor the foot stands on,
 * and in the middle the crucible former: a post from the floor up to the flask bottom (hidden inside the foot), then
 * the flared cone up to the trunk bottom.
 */
export function baseProfile(): Profile {
  const { pts, soft, hard, arc } = profileBuilder()
  const { radius, height, edge, floor, clearance, coneRadius, coneHeight } = MOLD.base
  const top = MOLD.baseTopY
  const bottom = top - height
  const floorY = bottom + floor
  const bore = FOOT_RADIUS + clearance
  const coneTop = floorY + coneHeight
  const flareFrom = MOLD.flask.bottomY
  const coneRise = coneTop - flareFrom

  soft(0, bottom)
  arc(radius - edge, bottom + edge, edge, -Math.PI / 2, 0)
  arc(radius - edge, top - edge, edge, 0, Math.PI / 2)
  hard(bore, top)
  hard(bore, floorY)
  hard(coneRadius, floorY)
  hard(coneRadius, flareFrom)
  // Crucible former: a flared cone, steeper toward the top where the trunk starts.
  soft(coneRadius * 0.75, flareFrom + coneRise * 0.24)
  soft(coneRadius * 0.53, flareFrom + coneRise * 0.55)
  hard(MOLD.trunk.radius * 1.4, coneTop)
  soft(0, coneTop)
  return pts
}

/**
 * One short open tube per hole, through the whole wall, in flask-local space (like the shells). Each tube is a
 * straight radial cylinder (the cross-section the shader cuts), circumscribed around the cut circle so no gap shows
 * at the cut; its ends follow the outer and the inner cylinder (plus a hair of overshoot). Normals and winding face
 * the bore axis: the tube is seen from inside the hole only, so it renders FrontSide with the plain steel.
 */
export function createBoreGeometry(): THREE.BufferGeometry {
  const centers = holeCenters()
  const n = BORE_SEGMENTS
  const rb = HOLE_RADIUS / Math.cos(Math.PI / n)
  const count = centers.length * (n + 1) * 2
  const position = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const index: number[] = []
  let v = 0
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    position.set([x, y, z], v * 3)
    normal.set([nx, ny, nz], v * 3)
    v++
  }
  for (const c of centers) {
    // Axis direction d (outward, azimuth convention atan2(-z, x)) and the horizontal tangent t.
    const dx = Math.cos(c.azimuth)
    const dz = -Math.sin(c.azimuth)
    const tx = Math.sin(c.azimuth)
    const tz = Math.cos(c.azimuth)
    const first = v
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * TAU
      const cs = Math.cos(th)
      const sn = Math.sin(th)
      const u = rb * cs
      const y = c.y + rb * sn
      // Vertex 2i on the outer surface, 2i + 1 on the inner one.
      const so = Math.sqrt(FLASK_RADIUS * FLASK_RADIUS - u * u) + BORE_OVERSHOOT
      const si = Math.sqrt(FLASK_INNER_RADIUS * FLASK_INNER_RADIUS - u * u) - BORE_OVERSHOOT
      put(so * dx + u * tx, y, so * dz + u * tz, -cs * tx, -sn, -cs * tz)
      put(si * dx + u * tx, y, si * dz + u * tz, -cs * tx, -sn, -cs * tz)
    }
    for (let i = 0; i < n; i++) {
      const out0 = first + 2 * i
      const in0 = out0 + 1
      const out1 = out0 + 2
      const in1 = out0 + 3
      index.push(out0, in0, out1, in0, in1, out1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  geometry.setIndex(index)
  return geometry
}

export interface FlaskMaterialHandle {
  material: THREE.MeshStandardMaterial
}

const f = (n: number) => n.toFixed(6)

const VERTEX_VARYINGS = '#include <common>\nvarying vec3 vFlaskLocal;'
// `position` is the geometry-local point: independent of the descent and the spin applied by the parents.
const VERTEX_LOCAL = '#include <begin_vertex>\nvFlaskLocal = position;'

const FRAGMENT_PARS = [
  '#include <common>',
  'varying vec3 vFlaskLocal;',
  `#define FLASK_R ${f(FLASK_RADIUS)}`,
  `#define FLASK_H ${f(MOLD.flask.height)}`,
  `#define HOLE_COLUMNS ${HOLE_COLUMNS.toFixed(1)}`,
  `#define HOLE_ROWS ${HOLE_ROWS.toFixed(1)}`,
  `#define HOLE_RADIUS ${f(HOLE_RADIUS)}`,
  `#define HOLE_BAND_BOTTOM ${f(HOLE_BAND.bottom)}`,
  `#define HOLE_AZIMUTH0 (${f(HOLE_AZIMUTH0)})`,
  `#define ROW_PITCH ${f(ROW_PITCH)}`,
  `#define HOLE_EDGE_WIDTH ${f(HOLE_EDGE.edge)}`,
  // Rim highlight: brighten the lit steel, lift the dark side a little, never past the bloom threshold (0.85).
  '#define HOLE_EDGE_GAIN 0.7',
  '#define HOLE_EDGE_LIFT 0.035',
  '#define HOLE_EDGE_CAP 0.72',
  '#define INNER_SHADE 0.78',
  `#define BRUSH_FINE ${f(BRUSH.fine)}`,
  `#define BRUSH_COARSE ${f(BRUSH.coarse)}`,
  `#define BRUSH_CELLS_FINE ${BRUSH.cellsFine.toFixed(1)}`,
  `#define BRUSH_CELLS_COARSE ${BRUSH.cellsCoarse.toFixed(1)}`,
  `#define BRUSH_ROUGHNESS ${f(BRUSH.roughness)}`,
  `#define BRUSH_TINT ${f(BRUSH.tint)}`,
  '// Mirrors flaskHoleDistance() in flaskMaterial.ts: distance to the nearest radial bore wall, negative inside.',
  'float flaskHoleDistance(vec3 p) {',
  '  float az = atan(-p.z, p.x);',
  '  float rowCoord = (p.y + FLASK_H * 0.5 - HOLE_BAND_BOTTOM) / ROW_PITCH - 0.5;',
  '  float r0 = floor(rowCoord);',
  '  float colBase = (az - HOLE_AZIMUTH0) / PI2 * HOLE_COLUMNS;',
  '  float best = 1e3;',
  '  for (int i = 0; i < 2; i++) {',
  '    float r = r0 + float(i);',
  '    if (r < 0.0 || r > HOLE_ROWS - 1.0) continue;',
  '    float c = colBase - 0.5 * mod(r, 2.0);',
  '    float dx = length(p.xz) * sin((c - floor(c + 0.5)) * PI2 / HOLE_COLUMNS);',
  '    float dy = (rowCoord - r) * ROW_PITCH;',
  '    best = min(best, length(vec2(dx, dy)));',
  '  }',
  '  return best - HOLE_RADIUS;',
  '}',
  'float flaskHash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }',
  '// Value noise, periodic in x with `period` cells (seamless around the circumference).',
  'float flaskNoise(vec2 q, float period) {',
  '  vec2 i = floor(q);',
  '  vec2 t = fract(q);',
  '  t = t * t * (3.0 - 2.0 * t);',
  '  float x0 = mod(i.x, period);',
  '  float x1 = mod(i.x + 1.0, period);',
  '  float a = mix(flaskHash(vec2(x0, i.y)), flaskHash(vec2(x1, i.y)), t.x);',
  '  float b = mix(flaskHash(vec2(x0, i.y + 1.0)), flaskHash(vec2(x1, i.y + 1.0)), t.x);',
  '  return mix(a, b, t.y);',
  '}',
].join('\n')

// All derivatives are taken before the discard (uniform control flow). The hole distance is continuous across
// atan's +-PI jump (the column coordinate jumps by a whole number of columns), so fwidth has no seam; the brushing
// noise is periodic around the circumference for the same reason.
const FRAGMENT_HOLES = [
  '#include <clipping_planes_fragment>',
  'float flaskU = atan(-vFlaskLocal.z, vFlaskLocal.x) / PI2 + 0.5;',
  '// Streak coordinate: the height on the shell, the radius on flat faces (concentric rings on the flange top).',
  'float flaskS = vFlaskLocal.y + length(vFlaskLocal.xz);',
  'float flaskFineFade = 1.0 - smoothstep(0.5, 1.0, fwidth(flaskS) * BRUSH_FINE);',
  'float flaskBrush = flaskNoise(vec2(flaskU * BRUSH_CELLS_COARSE, flaskS * BRUSH_COARSE), BRUSH_CELLS_COARSE) - 0.5;',
  'flaskBrush += (flaskNoise(vec2(flaskU * BRUSH_CELLS_FINE, flaskS * BRUSH_FINE), BRUSH_CELLS_FINE) - 0.5) * flaskFineFade;',
  '#ifndef FLASK_NO_HOLES',
  'float flaskHole = flaskHoleDistance(vFlaskLocal);',
  'float flaskAA = max(fwidth(flaskHole), 1e-4);',
  '// Hard cut at the bore wall: the bore tube geometry shows the wall thickness, the tree and the investment show',
  '// through the rest.',
  'if (flaskHole < 0.0) discard;',
  '#endif',
].join('\n')

const FRAGMENT_TINT = '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 + flaskBrush * BRUSH_TINT;'
const FRAGMENT_ROUGHNESS =
  '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + flaskBrush * BRUSH_ROUGHNESS, 0.05, 1.0);'

// Runs right before opaque_fragment, on the lit color (tone mapping and color space conversion still follow).
const FRAGMENT_EDGES = [
  '#ifdef FLIP_SIDED',
  '  outgoingLight *= INNER_SHADE; // inner wall: less light reaches inside the tube',
  '#endif',
  '#ifndef FLASK_NO_HOLES',
  '{',
  '  float ew = max(HOLE_EDGE_WIDTH, flaskAA);',
  '  float flaskEdge = 1.0 - smoothstep(ew - flaskAA, ew + flaskAA, flaskHole);',
  '  vec3 flaskLit = max(outgoingLight, min(outgoingLight * (1.0 + HOLE_EDGE_GAIN) + HOLE_EDGE_LIFT, vec3(HOLE_EDGE_CAP)));',
  '  outgoingLight = mix(outgoingLight, flaskLit, flaskEdge);',
  '}',
  '#endif',
  '#include <opaque_fragment>',
].join('\n')

function createSteel(side: THREE.Side, holes: boolean): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(STEEL.color),
    metalness: 1,
    roughness: STEEL.roughness,
    envMapIntensity: STEEL.envMapIntensity,
    side,
  })
  const pars = holes ? FRAGMENT_PARS : `#define FLASK_NO_HOLES\n${FRAGMENT_PARS}`
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERTEX_VARYINGS)
      .replace('#include <begin_vertex>', VERTEX_LOCAL)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', pars)
      .replace('#include <clipping_planes_fragment>', FRAGMENT_HOLES)
      .replace('#include <color_fragment>', FRAGMENT_TINT)
      .replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS)
      .replace('#include <opaque_fragment>', FRAGMENT_EDGES)
  }
  material.customProgramCacheKey = () => (holes ? 'flask-steel-v3' : 'flask-steel-plain-v3')
  return material
}

/**
 * Perforated brushed-steel flask wall, fully opaque. Both surfaces share one shader source and program cache key
 * and differ only in `side` (three compiles one program per side, FLIP_SIDED on the back; both during the loader).
 * - back: BackSide on the inner surface (FLASK_INNER_RADIUS), seen through the top opening and the holes, a little
 *   darker.
 * - front: FrontSide on the outer surface (FLASK_RADIUS).
 * The bores are discarded on both (same radial cross-section), the bore tubes (createBoreGeometry) show the wall
 * thickness in every hole, and a thin bright highlight runs around each cut.
 */
export function createFlaskMaterial(side: 'back' | 'front'): FlaskMaterialHandle {
  return { material: createSteel(side === 'front' ? THREE.FrontSide : THREE.BackSide, true) }
}

/** Opaque brushed steel for the foot, flange, rim and bore tubes (same look as the wall, no holes). */
export function createSteelMaterial(): THREE.MeshStandardMaterial {
  return createSteel(THREE.FrontSide, false)
}
