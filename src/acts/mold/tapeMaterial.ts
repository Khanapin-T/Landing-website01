import * as THREE from 'three'
import { MOLD, TAPE_LENGTH } from '../../config/mold'

/** Opaque green PVC construction tape (scene color, never a UI accent). Tuned in integration. */
export const TAPE_COLOR = '#5aa03a'
/** Color multiplier where two turns overlap (a slightly darker, raised lap band). */
export const TAPE_OVERLAP_SHADE = 0.86
/** Color multiplier on the thin shadow line along the lap edge of the later strip. */
export const TAPE_LAP_LINE_SHADE = 0.55
/** Width of that shadow line in strip widths, measured up from the later strip's lower edge (about 1.2% of the flask height). */
export const TAPE_LAP_LINE_WIDTH = 0.04
export const TAPE_ROUGHNESS = 0.4
/** Faint grazing-angle sheen so the tape reads as plastic, not paper (added to the lit color). */
export const TAPE_SHEEN = 0.12
/** Width of the bright leading edge at the strip end, in turns (falls off steeply inside it). */
export const TAPE_EDGE_WIDTH = 0.03
/** Leading edge glow on the tape end being laid (reduced; the tape itself is opaque now). */
export const TAPE_EDGE_COLOR = '#d6ffb8'
export const TAPE_EDGE_INTENSITY = 1.0
/** Sort order of the two halves (harmless: the tape is in the opaque pass, renderOrder only orders it there). */
export const TAPE_RENDER_ORDER = { back: 10, front: 15 } as const

/** A JS number as a GLSL float literal (always with a decimal point). */
export function glslFloat(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n)
}

const DEFINES = [
  `#define TAPE_WIDTH ${glslFloat(MOLD.tape.width)}`,
  `#define TAPE_AZIMUTH0 ${glslFloat(MOLD.tape.azimuth0)}`,
  `#define TAPE_LENGTH ${glslFloat(TAPE_LENGTH)}`,
  `#define TAPE_PASSES ${TAPE_LENGTH}`,
  `#define TAPE_HEIGHT ${glslFloat(MOLD.flask.height)}`,
  `#define TAPE_OVERLAP_SHADE ${glslFloat(TAPE_OVERLAP_SHADE)}`,
  `#define TAPE_LAP_LINE_SHADE ${glslFloat(TAPE_LAP_LINE_SHADE)}`,
  `#define TAPE_LAP_LINE_WIDTH ${glslFloat(TAPE_LAP_LINE_WIDTH)}`,
  `#define TAPE_SHEEN ${glslFloat(TAPE_SHEEN)}`,
  `#define TAPE_EDGE_WIDTH ${glslFloat(TAPE_EDGE_WIDTH)}`,
].join('\n')

export interface TapeEval {
  /** Layers of tape over the point: 0 to 4 (the flat first and last turns stack with their neighbours). */
  layers: number
  /** Distance in turns from the strip end back to the laid strip at this point (1e9 if none). */
  edge: number
  /**
   * Where two or more layers overlap: distance from the lower edge of the topmost (latest) strip, in strip widths,
   * 0 at the lap edge up to 1. 1e9 where there is no overlap.
   */
  lap: number
}

/**
 * TS twin of the GLSL `tapeEval` below, step for step (GLSL `mod(x, 1.0)` is `x - floor(x)`). The mirror test checks
 * it against `tapeLayers` in config/mold.ts, the reference.
 */
export function tapeLayersGlsl(h: number, az: number, p: number): TapeEval {
  const x = (az - MOLD.tape.azimuth0) / (Math.PI * 2)
  const f = x - Math.floor(x)
  const front = p * TAPE_LENGTH
  const halfW = MOLD.tape.width * 0.5
  let layers = 0
  let edge = 1e9
  let lap = 1e9
  for (let k = 0; k < TAPE_LENGTH; k++) {
    const u = k + f
    if (u >= front) break
    const t = Math.min(Math.max((u - 1) / (TAPE_LENGTH - 2), 0), 1)
    const center = MOLD.tape.width * 0.5 + (1 - MOLD.tape.width) * (t * t * (3 - 2 * t))
    if (Math.abs(h - center) <= halfW) {
      layers += 1
      // No leading edge once the wrap is done (the strip's final end is just an end).
      if (p < 1) edge = Math.min(edge, front - u)
      // The latest counted strip lies on top of the earlier ones: measure from its lower edge.
      if (layers > 1) lap = (h - (center - halfW)) / MOLD.tape.width
    }
  }
  return { layers, edge, lap }
}

const GLSL_EVAL = /* glsl */ `
float tapeEval(float h, float az, float p, out float edge, out float lap) {
  float f = mod((az - TAPE_AZIMUTH0) / 6.283185307179586, 1.0);
  float front = p * TAPE_LENGTH;
  float layers = 0.0;
  edge = 1e9;
  lap = 1e9;
  for (int i = 0; i < TAPE_PASSES; i++) {
    float u = float(i) + f;
    if (u >= front) break;
    float t = clamp((u - 1.0) / (TAPE_LENGTH - 2.0), 0.0, 1.0);
    float center = TAPE_WIDTH * 0.5 + (1.0 - TAPE_WIDTH) * (t * t * (3.0 - 2.0 * t));
    if (abs(h - center) <= TAPE_WIDTH * 0.5) {
      layers += 1.0;
      if (p < 1.0) edge = min(edge, front - u);
      if (layers > 1.5) lap = (h - (center - TAPE_WIDTH * 0.5)) / TAPE_WIDTH;
    }
  }
  return layers;
}
`

const VERTEX_PARS = ['#include <common>', DEFINES, 'varying vec2 vTapeXZ;', 'varying float vTapeH;'].join('\n')

// Object-space position: the tape spins with the flask, so the pattern is fixed to the flask. The azimuth is computed
// per fragment from the interpolated xz (an interpolated atan2 would break across its branch cut).
const VERTEX_POS = '#include <begin_vertex>\nvTapeXZ = position.xz;\nvTapeH = position.y / TAPE_HEIGHT + 0.5;'

const FRAGMENT_PARS = [
  '#include <common>',
  DEFINES,
  'uniform float uProgress;',
  'uniform vec3 uEdgeColor;',
  'varying vec2 vTapeXZ;',
  'varying float vTapeH;',
  GLSL_EVAL,
].join('\n')

// Right after diffuseColor is declared: count the layers once, discard bare steel.
const FRAGMENT_LAYERS = [
  '#include <clipping_planes_fragment>',
  'float tapeEdge;',
  'float tapeLap;',
  'float tapeN = tapeEval(vTapeH, atan(-vTapeXZ.y, vTapeXZ.x), uProgress, tapeEdge, tapeLap);',
  'if (tapeN < 0.5) discard;',
].join('\n')

// Opaque tape. Two layers: slightly darker, plus a thin crisp shadow line along the later strip's lower edge, so the
// laps read as raised diagonal steps. No fwidth: the line is a fixed-width smoothstep in strip coordinates.
const FRAGMENT_COLOR = [
  '#include <color_fragment>',
  'diffuseColor.rgb *= tapeN > 1.5 ? TAPE_OVERLAP_SHADE : 1.0;',
  'diffuseColor.rgb *= mix(TAPE_LAP_LINE_SHADE, 1.0, smoothstep(TAPE_LAP_LINE_WIDTH * 0.5, TAPE_LAP_LINE_WIDTH, tapeLap));',
].join('\n')

// Faint plastic sheen at grazing angles, plus a bright edge right at the strip end so the lay point reads.
const FRAGMENT_EDGE = [
  '{',
  '  float tapeFres = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));',
  '  outgoingLight += mix(diffuseColor.rgb, vec3(1.0), 0.5) * (tapeFres * tapeFres * tapeFres * TAPE_SHEEN);',
  '  float tapeGlow = 1.0 - clamp(tapeEdge / TAPE_EDGE_WIDTH, 0.0, 1.0);',
  '  tapeGlow = tapeGlow * tapeGlow * tapeGlow;',
  '  outgoingLight += uEdgeColor * tapeGlow;',
  '}',
  '#include <opaque_fragment>',
].join('\n')

export interface TapeMaterialHandle {
  material: THREE.MeshStandardMaterial
  uniforms: {
    uProgress: { value: number }
    uEdgeColor: { value: THREE.Color }
  }
}

/**
 * Tape wrapped around the flask (flat first and last turn, helix between; the pattern mirrors `tapeLayers` in config/mold.ts). `uProgress` = wrap
 * progress 0..1 is the only state. Both halves share the shader source and cache key; they differ only in `side`
 * (which three turns into FLIP_SIDED, so the halves compile as two programs, both during Precompile).
 */
export function createTapeMaterial(side: 'back' | 'front'): TapeMaterialHandle {
  const uniforms: TapeMaterialHandle['uniforms'] = {
    uProgress: { value: 0 },
    uEdgeColor: { value: new THREE.Color(TAPE_EDGE_COLOR).multiplyScalar(TAPE_EDGE_INTENSITY) },
  }
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(TAPE_COLOR),
    metalness: 0,
    roughness: TAPE_ROUGHNESS,
    transparent: false,
    depthWrite: true,
    side: side === 'back' ? THREE.BackSide : THREE.FrontSide,
  })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERTEX_PARS)
      .replace('#include <begin_vertex>', VERTEX_POS)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAGMENT_PARS)
      .replace('#include <clipping_planes_fragment>', FRAGMENT_LAYERS)
      .replace('#include <color_fragment>', FRAGMENT_COLOR)
      .replace('#include <opaque_fragment>', FRAGMENT_EDGE)
  }
  material.customProgramCacheKey = () => 'tape-wrap-v3'
  return { material, uniforms }
}
