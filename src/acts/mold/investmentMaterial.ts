import * as THREE from 'three'
import { MOLD } from '../../config/mold'

/** Cool off-white investment (scene color, tuned in integration). */
export const INVESTMENT_COLOR = '#d6dbe0'
/** Lighter foam toward the rim and on the bumps while the vacuum boils the surface. */
export const FOAM_COLOR = '#f3f5f6'
/** Back half: the inside of the far wall, nearly opaque. */
export const BACK_ALPHA = 0.95
/** Front half: ghosted so the rings stay visible, plus a fresnel term at the silhouette. */
export const FRONT_ALPHA = 0.2
export const FRONT_FRESNEL = 0.45
/** Surface disc: milky but not fully opaque (the rings below stay readable from above during the pour). */
export const SURFACE_ALPHA = 0.8
/** Radius of the investment body and surface (just inside the flask wall). */
export const INVESTMENT_RADIUS = MOLD.flask.innerRadius - 0.01
/** Default level, far below the flask bottom: nothing of the body shows before the first frame sets it. */
export const LEVEL_OFF = -100

/**
 * See the layer order table in the s03 plan. The surface sits between the halves: from above it covers the back
 * half and never overlaps the front half; from below it is seen through the front half.
 */
export const INVESTMENT_RENDER_ORDER = { back: 12, surface: 12.5, front: 13, stream: 0 } as const

export type InvestmentPart = 'back' | 'front' | 'surface' | 'stream'

/** Uniforms shared by every investment part (written once per frame by Investment). */
export interface InvestmentSharedUniforms {
  /** World Y of the investment surface; body fragments above it are discarded. */
  uLevelY: { value: number }
  /** Seconds (ambient motion, keeps moving when the scroll stops). */
  uTime: { value: number }
  /** Vacuum boil strength 0..1. */
  uBoil: { value: number }
  /** Pour ripple strength 0..1 (rings around the stream impact while pouring). */
  uPour: { value: number }
  uFoamColor: { value: THREE.Color }
}

export interface InvestmentUniforms extends InvestmentSharedUniforms {
  /** 1 = discard above the level (body halves), 0 = never (surface, stream). */
  uClip: { value: number }
  /** Fresnel alpha + brightening at the silhouette (front half only). */
  uFresnel: { value: number }
  /** 1 = surface disc: vertex ripple / boil displacement and foam. */
  uSurface: { value: number }
  /** 1 = pour stream: narrowing and wobble along its length. */
  uStream: { value: number }
  /** Current stream length in world units (the mesh is a unit cylinder scaled in Y). */
  uStreamLen: { value: number }
}

export interface InvestmentMaterialHandle {
  material: THREE.MeshStandardMaterial
  uniforms: InvestmentUniforms
}

export function createInvestmentUniforms(): InvestmentSharedUniforms {
  return {
    uLevelY: { value: LEVEL_OFF },
    uTime: { value: 0 },
    uBoil: { value: 0 },
    uPour: { value: 0 },
    uFoamColor: { value: new THREE.Color(FOAM_COLOR) },
  }
}

const VERTEX_PARS = [
  '#include <common>',
  'uniform float uTime;',
  'uniform float uBoil;',
  'uniform float uPour;',
  'uniform float uSurface;',
  'uniform float uStream;',
  'uniform float uStreamLen;',
  'varying float vInvWorldY;',
  'varying float vInvRim;',
  'varying float vInvBump;',
  `#define INV_RADIUS ${INVESTMENT_RADIUS.toFixed(4)}`,
  // Value noise (hash by Inigo Quilez), cheap enough for a few thousand surface vertices.
  'float invHash(vec3 p) {',
  '  p = fract(p * 0.3183099 + 0.1);',
  '  p *= 17.0;',
  '  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));',
  '}',
  'float invNoise(vec3 x) {',
  '  vec3 i = floor(x);',
  '  vec3 f = fract(x);',
  '  f = f * f * (3.0 - 2.0 * f);',
  '  return mix(',
  '    mix(mix(invHash(i), invHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(invHash(i + vec3(0.0, 1.0, 0.0)), invHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),',
  '    mix(mix(invHash(i + vec3(0.0, 0.0, 1.0)), invHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(invHash(i + vec3(0.0, 1.0, 1.0)), invHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),',
  '    f.z);',
  '}',
  // Surface height at disc point p (object XZ): calm sines, pour rings around the center, boil bumps.
  'float invSurfaceHeight(vec2 p) {',
  '  float t = uTime;',
  '  float calm = 0.004 * (sin(p.x * 3.1 + t * 1.3) + sin(p.y * 2.7 - t * 1.1) + 0.6 * sin((p.x + p.y) * 4.3 + t * 1.7));',
  '  float r = length(p);',
  '  float pour = uPour * 0.008 * sin(r * 16.0 - t * 5.0) * exp(-r * 1.6);',
  '  float n = invNoise(vec3(p * 5.0, t * 1.6));',
  '  float boil = uBoil * 0.05 * (2.0 * n * n * n - 0.25);',
  '  return calm + pour + boil;',
  '}',
].join('\n')

// Runs right after objectNormal is declared and before begin_vertex declares `transformed`.
const VERTEX_SURFACE = [
  '#include <beginnormal_vertex>',
  'float invDisp = 0.0;',
  'vInvRim = 0.0;',
  'vInvBump = 0.0;',
  'if (uSurface > 0.5) {',
  '  vec2 invP = position.xz;',
  '  float invR = length(invP) / INV_RADIUS;',
  '  // Calm at the wall so the disc edge meets the body cut exactly.',
  '  float invFade = 1.0 - smoothstep(0.75, 1.0, invR);',
  '  float invE = 0.01;',
  '  float invH0 = invSurfaceHeight(invP);',
  '  float invHx = invSurfaceHeight(invP + vec2(invE, 0.0));',
  '  float invHz = invSurfaceHeight(invP + vec2(0.0, invE));',
  '  invDisp = invH0 * invFade;',
  '  objectNormal = normalize(vec3(-(invHx - invH0) * invFade / invE, 1.0, -(invHz - invH0) * invFade / invE));',
  '  vInvRim = invR;',
  '  vInvBump = uBoil * smoothstep(0.45, 0.9, invNoise(vec3(invP * 5.0, uTime * 1.6)));',
  '}',
].join('\n')

const VERTEX_DISPLACE = [
  '#include <begin_vertex>',
  'transformed.y += invDisp;',
  'if (uStream > 0.5) {',
  '  // Unit cylinder from y = 0 (top) to y = -1 (bottom): narrows as it falls, wobbles more toward the bottom.',
  '  float invDown = clamp(-position.y, 0.0, 1.0);',
  '  float invS = invDown * uStreamLen;',
  '  transformed.xz *= mix(1.0, 0.65, invDown);',
  '  transformed.xz += vec2(sin(invS * 6.0 - uTime * 9.0), cos(invS * 4.5 - uTime * 7.0)) * 0.012 * (0.2 + 0.8 * invDown);',
  '}',
].join('\n')

// Computed directly (worldpos_vertex only defines `worldPosition` under some defines).
const VERTEX_WORLD_Y = '#include <worldpos_vertex>\nvInvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;'

const FRAGMENT_PARS = [
  '#include <common>',
  'uniform float uLevelY;',
  'uniform float uClip;',
  'uniform float uFresnel;',
  'uniform float uSurface;',
  'uniform float uBoil;',
  'uniform vec3 uFoamColor;',
  'varying float vInvWorldY;',
  'varying float vInvRim;',
  'varying float vInvBump;',
].join('\n')

const FRAGMENT_CLIP = '#include <clipping_planes_fragment>\nif (uClip > 0.5 && vInvWorldY > uLevelY) discard;'

const FRAGMENT_FOAM = [
  '#include <color_fragment>',
  'diffuseColor.rgb = mix(diffuseColor.rgb, uFoamColor, uSurface * clamp(uBoil * smoothstep(0.55, 1.0, vInvRim) + vInvBump, 0.0, 1.0));',
].join('\n')

// Runs right before opaque_fragment: `normal`, `vViewPosition`, `reflectedLight` and `outgoingLight` are in scope.
const FRAGMENT_FINISH = [
  '{',
  '  // Slightly warmer where lit directly (the base color stays cool in the shade).',
  '  float invLit = clamp(dot(reflectedLight.directDiffuse, vec3(0.3333)) * 2.0, 0.0, 1.0);',
  '  outgoingLight *= mix(vec3(1.0), vec3(1.05, 1.0, 0.93), invLit);',
  '  // Ghosted front half: alpha and brightness rise toward the silhouette.',
  '  float invFres = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);',
  '  diffuseColor.a = clamp(diffuseColor.a + uFresnel * invFres, 0.0, 1.0);',
  '  outgoingLight += uFresnel * invFres * diffuseColor.rgb * 0.25;',
  '}',
  '#include <opaque_fragment>',
].join('\n')

interface PartConfig {
  side: THREE.Side
  transparent: boolean
  depthWrite: boolean
  opacity: number
  roughness: number
  clip: number
  fresnel: number
  surface: number
  stream: number
}

const PARTS: Record<InvestmentPart, PartConfig> = {
  back: { side: THREE.BackSide, transparent: true, depthWrite: true, opacity: BACK_ALPHA, roughness: 0.85, clip: 1, fresnel: 0, surface: 0, stream: 0 },
  front: { side: THREE.FrontSide, transparent: true, depthWrite: false, opacity: FRONT_ALPHA, roughness: 0.85, clip: 1, fresnel: FRONT_FRESNEL, surface: 0, stream: 0 },
  // Double-sided: the camera looks at the top from below during the vacuum push-in.
  surface: { side: THREE.DoubleSide, transparent: true, depthWrite: false, opacity: SURFACE_ALPHA, roughness: 0.35, clip: 0, fresnel: 0, surface: 1, stream: 0 },
  stream: { side: THREE.FrontSide, transparent: false, depthWrite: true, opacity: 1, roughness: 0.3, clip: 0, fresnel: 0, surface: 0, stream: 1 },
}

/**
 * Investment (cool off-white, MeshStandardMaterial, no transmission). Every part injects the same source and uses
 * the same program key; parts differ only by uniforms and material flags:
 * - back / front: the liquid body halves, cut at the shared world level uLevelY.
 * - surface: the disc at the level, rippling (time-based) and boiling with uBoil, foam toward the rim.
 * - stream: the pour, a unit cylinder scaled to the current length.
 */
export function createInvestmentMaterial(
  part: InvestmentPart,
  shared: InvestmentSharedUniforms = createInvestmentUniforms(),
): InvestmentMaterialHandle {
  const cfg = PARTS[part]
  const uniforms: InvestmentUniforms = {
    ...shared,
    uClip: { value: cfg.clip },
    uFresnel: { value: cfg.fresnel },
    uSurface: { value: cfg.surface },
    uStream: { value: cfg.stream },
    uStreamLen: { value: 1 },
  }
  const color = new THREE.Color(INVESTMENT_COLOR)
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.06,
    metalness: 0,
    roughness: cfg.roughness,
    envMapIntensity: 0.7,
    side: cfg.side,
    transparent: cfg.transparent,
    depthWrite: cfg.depthWrite,
    opacity: cfg.opacity,
    forceSinglePass: true,
  })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERTEX_PARS)
      .replace('#include <beginnormal_vertex>', VERTEX_SURFACE)
      .replace('#include <begin_vertex>', VERTEX_DISPLACE)
      .replace('#include <worldpos_vertex>', VERTEX_WORLD_Y)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAGMENT_PARS)
      .replace('#include <clipping_planes_fragment>', FRAGMENT_CLIP)
      .replace('#include <color_fragment>', FRAGMENT_FOAM)
      .replace('#include <opaque_fragment>', FRAGMENT_FINISH)
  }
  material.customProgramCacheKey = () => 'investment-v1'
  return { material, uniforms }
}
