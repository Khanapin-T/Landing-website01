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
/** Hole radius in world units. */
export const HOLE_RADIUS = 0.12
/** Plain steel left below the first row (flange) and above the last row (rim), world units. */
export const HOLE_BAND = { bottom: 0.34, top: 0.22 } as const
/** Object-space azimuth of the first row's column 0 (facing the camera at rest, see the azimuth convention). */
export const HOLE_AZIMUTH0 = -Math.PI / 2

/** Flange at the flask bottom (sits on the rubber base) and the rolled rim at the top, world units. */
export const FLANGE = { height: 0.07, overhang: 0.09 } as const
export const RIM = { tube: 0.018 } as const

/** Front (ghost) half: alpha of the flat steel, outline width (world units) and colors. */
export const FRONT_ALPHA = 0.12
export const OUTLINE_WIDTH = 0.014
/** Hole outlines: cool white, slightly over the bloom threshold (0.85). */
export const OUTLINE_COLOR = '#dce8f5'
export const OUTLINE_INTENSITY = 1.2
/** Fresnel rim on the silhouette edges. */
export const RIM_COLOR = '#c6d4e3'
export const RIM_INTENSITY = 0.55
export const RIM_ALPHA = 0.45
/** Steel surface. */
export const STEEL_COLOR = '#9aa3ad'

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

export interface FlaskMaterialHandle {
  material: THREE.MeshStandardMaterial
  uniforms: {
    /** 0 = opaque inner steel (back half), 1 = ghosted outline (front half). */
    uGhost: { value: number }
    uAlpha: { value: number }
    uOutlineColor: { value: THREE.Color }
    uRimColor: { value: THREE.Color }
    uRimAlpha: { value: number }
  }
}

const f = (n: number) => n.toFixed(6)

const VERTEX_VARYINGS = '#include <common>\nvarying vec3 vFlaskLocal;'
// `position` is the geometry-local point: independent of the descent and the spin applied by the parents.
const VERTEX_LOCAL = '#include <begin_vertex>\nvFlaskLocal = position;'

const FRAGMENT_PARS = [
  '#include <common>',
  'uniform float uGhost;',
  'uniform float uAlpha;',
  'uniform vec3 uOutlineColor;',
  'uniform vec3 uRimColor;',
  'uniform float uRimAlpha;',
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
  `#define OUTLINE_WIDTH ${f(OUTLINE_WIDTH)}`,
  '#define HOLE_EDGE_WIDTH 0.03',
  '#define HOLE_EDGE_SHADE 0.55',
  '#define INNER_SHADE 0.8',
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
].join('\n')

// Derivatives are taken before any discard (uniform control flow). The distance is continuous across atan's
// +-PI jump (the column coordinate jumps by a whole number of columns), so fwidth has no seam.
const FRAGMENT_HOLES = [
  '#include <clipping_planes_fragment>',
  'float flaskHole = flaskHoleDistance(vFlaskLocal);',
  'float flaskAA = max(fwidth(flaskHole), 1e-4);',
  '// Back: hard cut. Front: the last pixel fades out through alpha below.',
  'if (flaskHole < -flaskAA * uGhost) discard;',
].join('\n')

// Runs right before opaque_fragment: `normal` (view space, already flipped for BackSide), `vViewPosition` and
// `outgoingLight` are in scope; tone mapping and color space conversion still follow.
const FRAGMENT_GHOST = [
  '{',
  '  float flaskFres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);',
  '  // Back (inner wall): a little darker overall, and darker along the cut edge of each hole.',
  '  float holeEdge = 1.0 - smoothstep(0.0, HOLE_EDGE_WIDTH, flaskHole);',
  '  outgoingLight *= mix(INNER_SHADE * (1.0 - HOLE_EDGE_SHADE * holeEdge), 1.0, uGhost);',
  '  // Front: thin bright outline around each hole (at least ~1 px wide), plus a fresnel rim on the silhouette.',
  '  float ow = max(OUTLINE_WIDTH, flaskAA * 1.25);',
  '  float inHole = smoothstep(-flaskAA, flaskAA, flaskHole);',
  '  float outline = (1.0 - smoothstep(ow - flaskAA, ow + flaskAA, flaskHole)) * inHole;',
  '  outgoingLight += uGhost * (outline * uOutlineColor + flaskFres * uRimColor);',
  '  float ghostAlpha = clamp(uAlpha + 0.85 * outline + uRimAlpha * flaskFres, 0.0, 1.0) * inHole;',
  '  diffuseColor.a = mix(1.0, ghostAlpha, uGhost);',
  '}',
  '#include <opaque_fragment>',
].join('\n')

/**
 * Perforated steel flask. Both halves share one shader source and program cache key; they differ only through
 * uniforms (uGhost, uAlpha) and the material flags side / transparent / depthWrite. (three still compiles one
 * program per side and per opaque/transparent pipeline from those flags; both are compiled during the loader.)
 * - back: BackSide, opaque. The inside of the tube; holes discarded, darker hole edges.
 * - front: FrontSide, transparent, no depth write. Faint steel, bright hole outlines, fresnel rim, clear holes.
 */
export function createFlaskMaterial(side: 'back' | 'front'): FlaskMaterialHandle {
  const front = side === 'front'
  const uniforms: FlaskMaterialHandle['uniforms'] = {
    uGhost: { value: front ? 1 : 0 },
    uAlpha: { value: FRONT_ALPHA },
    uOutlineColor: { value: new THREE.Color(OUTLINE_COLOR).multiplyScalar(OUTLINE_INTENSITY) },
    uRimColor: { value: new THREE.Color(RIM_COLOR).multiplyScalar(RIM_INTENSITY) },
    uRimAlpha: { value: RIM_ALPHA },
  }
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(STEEL_COLOR),
    metalness: 1,
    roughness: 0.38,
    envMapIntensity: 0.9,
    side: front ? THREE.FrontSide : THREE.BackSide,
    transparent: front,
    depthWrite: !front,
  })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERTEX_VARYINGS)
      .replace('#include <begin_vertex>', VERTEX_LOCAL)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAGMENT_PARS)
      .replace('#include <clipping_planes_fragment>', FRAGMENT_HOLES)
      .replace('#include <opaque_fragment>', FRAGMENT_GHOST)
  }
  material.customProgramCacheKey = () => 'flask-steel-v1'
  return { material, uniforms }
}

/** Plain opaque steel for the flange and the rim (same look as the shell, no holes). */
export function createSteelMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(STEEL_COLOR), metalness: 1, roughness: 0.34, envMapIntensity: 0.9 })
}
