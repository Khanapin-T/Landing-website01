import * as THREE from 'three'
import { MOLD, TAPE_LENGTH } from '../../config/mold'

/** Translucent green construction tape (scene color, never a UI accent). Tuned in integration. */
export const TAPE_COLOR = '#5aa03a'
/** Alpha of one layer of tape. */
export const TAPE_ALPHA = 0.45
/** Alpha where two turns overlap: two stacked layers, 1 - (1 - a)^2. */
export const TAPE_ALPHA_DOUBLE = 0.7
/** Color multiplier where two turns overlap (darker lap band). */
export const TAPE_OVERLAP_SHADE = 0.72
export const TAPE_ROUGHNESS = 0.45
/** Width of the bright leading edge at the strip end, in turns (falls off steeply inside it). */
export const TAPE_EDGE_WIDTH = 0.04
/** Leading edge glow (slightly crosses the bloom threshold). */
export const TAPE_EDGE_COLOR = '#d6ffb8'
export const TAPE_EDGE_INTENSITY = 1.6
/** Explicit transparent sort order, see the plan's layer table. */
export const TAPE_RENDER_ORDER = { back: 10, front: 15 } as const

/** A JS number as a GLSL float literal (always with a decimal point). */
export function glslFloat(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n)
}

const DEFINES = [
  `#define TAPE_TURNS ${glslFloat(MOLD.tape.turns)}`,
  `#define TAPE_COVERAGE ${glslFloat(MOLD.tape.coverage)}`,
  `#define TAPE_AZIMUTH0 ${glslFloat(MOLD.tape.azimuth0)}`,
  `#define TAPE_LENGTH ${glslFloat(TAPE_LENGTH)}`,
  `#define TAPE_HEIGHT ${glslFloat(MOLD.flask.height)}`,
  `#define TAPE_ALPHA ${glslFloat(TAPE_ALPHA)}`,
  `#define TAPE_ALPHA_DOUBLE ${glslFloat(TAPE_ALPHA_DOUBLE)}`,
  `#define TAPE_OVERLAP_SHADE ${glslFloat(TAPE_OVERLAP_SHADE)}`,
  `#define TAPE_EDGE_WIDTH ${glslFloat(TAPE_EDGE_WIDTH)}`,
].join('\n')

export interface TapeEval {
  /** Layers of tape over the point: 0, 1 or 2. */
  layers: number
  /** Distance in turns from the strip end back to the laid strip at this point (1e9 if none). */
  edge: number
}

/**
 * TS twin of the GLSL `tapeEval` below, step for step (GLSL `mod(x, 1.0)` is `x - floor(x)`). The mirror test checks
 * it against `tapeLayers` in config/mold.ts, the reference. Coverage < 2, so at most two candidate turns.
 */
export function tapeLayersGlsl(h: number, az: number, p: number): TapeEval {
  const x = (az - MOLD.tape.azimuth0) / (Math.PI * 2)
  const f = x - Math.floor(x)
  const c = h * MOLD.tape.turns - f
  const front = -1 + p * TAPE_LENGTH
  const kStart = Math.max(-1, Math.ceil(c - MOLD.tape.coverage * 0.5))
  const kEnd = Math.floor(c + MOLD.tape.coverage * 0.5)
  let layers = 0
  let edge = 1e9
  for (let i = 0; i < 2; i++) {
    const k = kStart + i
    if (k > kEnd) break
    if (k + f <= front) {
      layers += 1
      edge = Math.min(edge, front - (k + f))
    }
  }
  return { layers, edge }
}

const GLSL_EVAL = /* glsl */ `
float tapeEval(float h, float az, float p, out float edge) {
  float f = mod((az - TAPE_AZIMUTH0) / 6.283185307179586, 1.0);
  float c = h * TAPE_TURNS - f;
  float front = -1.0 + p * TAPE_LENGTH;
  float kStart = max(-1.0, ceil(c - TAPE_COVERAGE * 0.5));
  float kEnd = floor(c + TAPE_COVERAGE * 0.5);
  float layers = 0.0;
  edge = 1e9;
  for (int i = 0; i < 2; i++) {
    float k = kStart + float(i);
    if (k > kEnd) break;
    if (k + f <= front) {
      layers += 1.0;
      edge = min(edge, front - (k + f));
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
  'float tapeN = tapeEval(vTapeH, atan(-vTapeXZ.y, vTapeXZ.x), uProgress, tapeEdge);',
  'if (tapeN < 0.5) discard;',
].join('\n')

// Two layers: darker and denser, so the laps read as crisp diagonal bands.
const FRAGMENT_COLOR = [
  '#include <color_fragment>',
  'diffuseColor.rgb *= tapeN > 1.5 ? TAPE_OVERLAP_SHADE : 1.0;',
  'diffuseColor.a *= tapeN > 1.5 ? TAPE_ALPHA_DOUBLE : TAPE_ALPHA;',
].join('\n')

// Bright edge right at the strip end so the lay point reads; steep falloff keeps it thin.
const FRAGMENT_EDGE = [
  '{',
  '  float tapeGlow = 1.0 - clamp(tapeEdge / TAPE_EDGE_WIDTH, 0.0, 1.0);',
  '  tapeGlow = tapeGlow * tapeGlow * tapeGlow;',
  '  outgoingLight += uEdgeColor * tapeGlow;',
  '  diffuseColor.a = max(diffuseColor.a, tapeGlow);',
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
 * Tape wrapped around the flask in a helix (the pattern mirrors `tapeLayers` in config/mold.ts). `uProgress` = wrap
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
    transparent: true,
    depthWrite: false,
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
  material.customProgramCacheKey = () => 'tape-wrap-v1'
  return { material, uniforms }
}
