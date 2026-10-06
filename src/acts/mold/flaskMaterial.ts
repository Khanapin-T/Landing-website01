import * as THREE from 'three'
import { MOLD } from '../../config/mold'

const TAU = Math.PI * 2

/** Radius of the steel shell (the flask is modeled as one surface at its outer radius). */
export const FLASK_RADIUS = MOLD.flask.innerRadius + MOLD.flask.wall

/**
 * Perforation (after the reference flask): HOLE_COLUMNS holes around each row, HOLE_ROWS rows, every other row
 * shifted by half a column, so the holes form staggered vertical columns (2 x HOLE_COLUMNS of them).
 */
export const HOLE_COLUMNS = 6
export const HOLE_ROWS = 11
/** Hole radius in world units (the cut in the outer sheet). */
export const HOLE_RADIUS = 0.12
/** Plain steel left below the first row (flange) and above the last row (rim), world units. */
export const HOLE_BAND = { bottom: 0.34, top: 0.22 } as const
/** Object-space azimuth of the first row's column 0 (facing the camera at rest, see the azimuth convention). */
export const HOLE_AZIMUTH0 = -Math.PI / 2
/**
 * Sheet thickness at the hole edges, world units (each at least ~1 px wide on screen):
 * `bore` = dark ring just inside the cut (the wall of the punched hole), `edge` = thin bright highlight on the rim
 * just outside it.
 */
export const HOLE_EDGE = { bore: 0.018, edge: 0.012 } as const

/**
 * Flange at the flask foot (after the reference photo): a wide flat steel plate with chamfered edges, and a short
 * neck above it, a thin reinforcing ring where the body meets the plate. World units.
 */
export const FLANGE = { height: 0.12, overhang: 0.3, chamferTop: 0.04, chamferBottom: 0.015 } as const
export const NECK = { height: 0.07, overhang: 0.035, chamfer: 0.025 } as const
/** Thin rolled rim at the top. */
export const RIM = { tube: 0.024 } as const

/** Brushed stainless steel. */
export const STEEL = { color: '#aeb6bf', roughness: 0.34, envMapIntensity: 1.2 } as const
/**
 * Brushing: value noise stretched around the circumference. `fine` / `coarse` = streak frequency per world unit
 * along the height (and along the radius on flat faces), `cellsFine` / `cellsCoarse` = noise cells around the
 * circumference, `roughness` / `tint` = swing of the roughness and of the brightness.
 */
export const BRUSH = { fine: 160, coarse: 42, cellsFine: 36, cellsCoarse: 13, roughness: 0.07, tint: 0.07 } as const

const ROW_PITCH = (MOLD.flask.height - HOLE_BAND.bottom - HOLE_BAND.top) / HOLE_ROWS
const ARC_PITCH = (FLASK_RADIUS * TAU) / HOLE_COLUMNS

/**
 * Signed distance (world units, along the surface) from a shell point to the nearest hole edge: negative inside a
 * hole. `y` is the flask-local height with 0 at the middle of the flask, `azimuth` = atan2(-z, x). The fragment
 * shader mirrors this function exactly.
 */
export function flaskHoleDistance(y: number, azimuth: number): number {
  const rowCoord = (y + MOLD.flask.height / 2 - HOLE_BAND.bottom) / ROW_PITCH - 0.5
  const r0 = Math.floor(rowCoord)
  const colBase = ((azimuth - HOLE_AZIMUTH0) / TAU) * HOLE_COLUMNS
  let best = 1e3
  for (let i = 0; i < 2; i++) {
    const r = r0 + i
    if (r < 0 || r > HOLE_ROWS - 1) continue
    const c = colBase - 0.5 * (r % 2)
    const dx = (c - Math.floor(c + 0.5)) * ARC_PITCH
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
 * Lathe profile (x = radius, y = height in the Flask group, foot at MOLD.flask.bottomY) of the flange plate and its
 * neck: bottom face outward, up the chamfered outer edge, inward across the plate top, up the neck and its chamfer
 * onto the body, then down the inner face (that order gives outward-facing triangles). Every corner point is given
 * twice: LatheGeometry then puts a zero-length segment between them and each face keeps its own normal (hard edge).
 */
export function flangeProfile(): [number, number][] {
  const pts: [number, number][] = []
  const hard = (x: number, y: number) => pts.push([x, y], [x, y])
  const ri = FLASK_RADIUS - 0.004
  const ro = FLASK_RADIUS + FLANGE.overhang
  const rn = FLASK_RADIUS + NECK.overhang
  const y0 = MOLD.flask.bottomY
  const y1 = y0 + FLANGE.height
  const yn = y1 + NECK.height
  pts.push([ri, y0])
  hard(ro - FLANGE.chamferBottom, y0)
  hard(ro, y0 + FLANGE.chamferBottom)
  hard(ro, y1 - FLANGE.chamferTop)
  hard(ro - FLANGE.chamferTop, y1)
  hard(rn, y1)
  hard(rn, yn - NECK.chamfer)
  hard(FLASK_RADIUS, yn)
  hard(ri, yn)
  pts.push([ri, y0])
  return pts
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
  `#define ARC_PITCH ${f(ARC_PITCH)}`,
  `#define HOLE_BORE_WIDTH ${f(HOLE_EDGE.bore)}`,
  `#define HOLE_EDGE_WIDTH ${f(HOLE_EDGE.edge)}`,
  '#define HOLE_BORE_SHADE 0.32',
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
  '// Mirrors flaskHoleDistance() in flaskMaterial.ts: distance to the nearest hole edge, negative inside.',
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
  '    float dx = (c - floor(c + 0.5)) * ARC_PITCH;',
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
  '// Hard cut behind the bore ring: through the holes only the tree and the investment show.',
  'if (flaskHole < -max(HOLE_BORE_WIDTH, flaskAA)) discard;',
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
  '  float flaskBore = 1.0 - smoothstep(-flaskAA, flaskAA, flaskHole);',
  '  float ew = max(HOLE_EDGE_WIDTH, flaskAA);',
  '  float flaskEdge = (1.0 - smoothstep(ew - flaskAA, ew + flaskAA, flaskHole)) * (1.0 - flaskBore);',
  '  vec3 flaskLit = max(outgoingLight, min(outgoingLight * (1.0 + HOLE_EDGE_GAIN) + HOLE_EDGE_LIFT, vec3(HOLE_EDGE_CAP)));',
  '  outgoingLight = mix(outgoingLight, flaskLit, flaskEdge);',
  '  outgoingLight *= mix(1.0, HOLE_BORE_SHADE, flaskBore);',
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
  material.customProgramCacheKey = () => (holes ? 'flask-steel-v2' : 'flask-steel-plain-v2')
  return material
}

/**
 * Perforated brushed-steel flask, fully opaque. Both halves share one shader source and program cache key and
 * differ only in `side` (three compiles one program per side, FLIP_SIDED on the back; both during the loader).
 * - back: BackSide, the inner wall seen through the holes, a little darker.
 * - front: FrontSide, the outer wall.
 * Holes are discarded on both, so the tree and the investment are visible only through them; each hole shows a
 * dark bore ring inside the cut and a thin bright highlight on its rim.
 */
export function createFlaskMaterial(side: 'back' | 'front'): FlaskMaterialHandle {
  return { material: createSteel(side === 'front' ? THREE.FrontSide : THREE.BackSide, true) }
}

/** Opaque brushed steel for the flange and the rim (same look as the shell, no holes). */
export function createSteelMaterial(): THREE.MeshStandardMaterial {
  return createSteel(THREE.FrontSide, false)
}
