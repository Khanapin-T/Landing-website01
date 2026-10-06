import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { heatUniforms, xrayUniform } from '../../scene/furnace/uniforms'
import { FLASK_RADIUS, HOLE_RADIUS, holeCenters } from './flaskMaterial'

/** Milk-white investment with a faint warm cast, fully opaque (the steel flask hides the inside). */
export const INVESTMENT_COLOR = '#f1efe8'
/** Slightly lighter foam on the boil crests and the splash mound under the stream. */
export const FOAM_COLOR = '#fcfbf7'
/** A thick slurry: matte-ish with a soft sheen at grazing angles, not glossy water. */
export const INVESTMENT_ROUGHNESS = 0.55
export const STREAM_ROUGHNESS = 0.45
export const SHEEN = 0.18
/** Radius of the investment body and surface (just inside the flask wall). */
export const INVESTMENT_RADIUS = MOLD.flask.innerRadius - 0.01
/** Default level, far below the flask bottom: nothing of the body shows before the first frame sets it. */
export const LEVEL_OFF = -100

const PLUG_SEGMENTS = 20
const PLUG_RINGS = 3
/**
 * Investment plug in every flask hole (the tape covers the holes from outside, so the slurry fills them flush with
 * the outer wall). `radius` stays 0.01 inside the bore, `bulge` = dome height of the outer face past the outer wall
 * (the tape sits 0.012 out, on top of it), `sink` = how far the inner end reaches into the body column (no gap),
 * `segments` around, `rings` across the dome.
 */
export const PLUG = {
  radius: HOLE_RADIUS - 0.01,
  bulge: 0.006,
  sink: 0.005,
  segments: PLUG_SEGMENTS,
  rings: PLUG_RINGS,
  /** Side tube (inner and outer ring) plus the dome (rings and a center vertex). */
  verticesPerPlug: (PLUG_SEGMENTS + 1) * 2 + PLUG_RINGS * (PLUG_SEGMENTS + 1) + 1,
} as const

/**
 * Where the stream falls, poured from the side so it misses the tree and the rings (radius in world units from the
 * flask axis, azimuth by the convention a = atan2(-z, x)).
 */
export const POUR = MOLD.pour
/** World Y where the stream starts (above the top edge of the frame, also from the raised pour camera). */
export const STREAM_TOP_Y = 5.5
export const STREAM_RADIUS = 0.07
/** Fraction of the fill over which the stream grows from the top (start) and retracts from the top (end). */
export const STREAM_GROW = 0.03

/** Surface motion amplitudes (world units). */
const CALM_AMP = 0.006
const POUR_RING_AMP = 0.014
const MOUND_AMP = 0.035
const BOIL_AMP = 0.11

/** All parts are opaque; the order only keeps the overdraw low (body, then the surface over it). */
export const INVESTMENT_RENDER_ORDER = { body: 12, surface: 12.5, stream: 0 } as const

export type InvestmentPart = 'body' | 'surface' | 'stream' | 'funnel'

/**
 * Value for uLevelY. The body clip compares WORLD Y, so once the flask turns over (flip > 0) its corner fragments rise
 * above the old level; the clip is only needed while the level climbs, so it switches off for good after the flip starts.
 */
export function investmentClipLevel(level: number, flip: number): number {
  return flip > 0 ? 1000 : level
}

/** Impact point of the stream on the surface (flask-local x, z). */
export function pourPoint(): { x: number; z: number } {
  return { x: POUR.radius * Math.cos(POUR.azimuth), z: -POUR.radius * Math.sin(POUR.azimuth) }
}

const TAU = Math.PI * 2

/**
 * Every investment plug in one geometry, in flask-local space (y = 0 at the middle of the flask, like the bores), one
 * per hole from holeCenters(). Each plug is a straight radial cylinder on its hole axis: an open side tube from just
 * inside the body column (PLUG.sink) to the outer wall surface (its outer end follows the outer cylinder, so the rim
 * is flush with the steel all around), and a low dome over it (PLUG.bulge at the center). No inner cap: the inner end
 * sits inside the body. Drawn as one plain mesh with the body material, so it shares the body's program exactly (an
 * InstancedMesh would compile an extra instancing variant) and is cut at the level like the body.
 */
export function createPlugGeometry(): THREE.BufferGeometry {
  const centers = holeCenters()
  const { radius: rp, bulge, sink, segments: n, rings } = PLUG
  const R = FLASK_RADIUS
  const RB = INVESTMENT_RADIUS
  const count = centers.length * PLUG.verticesPerPlug
  const position = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const index: number[] = []
  const nv = new THREE.Vector3()
  let v = 0
  for (const c of centers) {
    // Axis direction d (outward, azimuth convention atan2(-z, x)), horizontal tangent t, and world up.
    const dx = Math.cos(c.azimuth)
    const dz = -Math.sin(c.azimuth)
    const tx = Math.sin(c.azimuth)
    const tz = Math.cos(c.azimuth)
    /** Vertex at distance `a` along d, offsets `u` along t and `w` up; normal given in (d, t, up). */
    const put = (a: number, u: number, w: number, nd: number, nt: number, nu: number) => {
      position.set([a * dx + u * tx, c.y + w, a * dz + u * tz], v * 3)
      nv.set(nd * dx + nt * tx, nu, nd * dz + nt * tz).normalize()
      normal.set([nv.x, nv.y, nv.z], v * 3)
      v++
    }

    // Side tube: vertex 2i on the inner end (in the body), 2i + 1 on the outer wall surface. Normals away from the axis.
    const side = v
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * TAU
      const cs = Math.cos(th)
      const sn = Math.sin(th)
      const u = rp * cs
      const w = rp * sn
      put(Math.sqrt(RB * RB - u * u) - sink, u, w, 0, cs, sn)
      put(Math.sqrt(R * R - u * u), u, w, 0, cs, sn)
    }
    for (let i = 0; i < n; i++) {
      const in0 = side + 2 * i
      const out0 = in0 + 1
      const in1 = in0 + 2
      const out1 = in0 + 3
      index.push(in0, out0, in1, out0, out1, in1)
    }

    // Dome: height field over the outer cylinder, a(u, w) = sqrt(R^2 - u^2) + bulge * (1 - (u^2 + w^2) / rp^2).
    const center = v
    put(R + bulge, 0, 0, 1, 0, 0)
    for (let j = 1; j <= rings; j++) {
      const s = j / rings
      for (let i = 0; i <= n; i++) {
        const th = (i / n) * TAU
        const u = rp * s * Math.cos(th)
        const w = rp * s * Math.sin(th)
        const wall = Math.sqrt(R * R - u * u)
        const au = -u / wall - (2 * bulge * u) / (rp * rp)
        const aw = (-2 * bulge * w) / (rp * rp)
        put(wall + bulge * (1 - s * s), u, w, 1, -au, -aw)
      }
    }
    const ring = (j: number, i: number) => center + 1 + (j - 1) * (n + 1) + i
    for (let i = 0; i < n; i++) index.push(center, ring(1, i + 1), ring(1, i))
    for (let j = 1; j < rings; j++) {
      for (let i = 0; i < n; i++) {
        index.push(ring(j, i), ring(j, i + 1), ring(j + 1, i), ring(j, i + 1), ring(j + 1, i + 1), ring(j + 1, i))
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  geometry.setIndex(index)
  return geometry
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/**
 * The visible part of the stream as fractions of the fall from STREAM_TOP_Y (0) to the surface (1). Over the first
 * STREAM_GROW of the fill the bottom end falls from the top to the surface; over the last STREAM_GROW the top end
 * falls to the surface. Both ends accelerate like falling liquid. top === bottom means nothing to draw.
 */
export function streamSpan(fill: number): { top: number; bottom: number } {
  if (fill <= 0) return { top: 0, bottom: 0 }
  if (fill >= 1) return { top: 1, bottom: 1 }
  const g = clamp01(fill / STREAM_GROW)
  const r = clamp01((fill - (1 - STREAM_GROW)) / STREAM_GROW)
  return { top: r * r, bottom: g * g }
}

/** Pour ripple / splash strength 0..1: on once the stream reaches the surface, fading while it retracts. */
export function pourStrength(fill: number): number {
  return smoothstep(STREAM_GROW, STREAM_GROW * 2, fill) * (1 - smoothstep(1 - STREAM_GROW, 1, fill))
}

/** Uniforms shared by every investment part (written once per frame by Investment). */
export interface InvestmentSharedUniforms {
  /** World Y of the investment surface; body fragments above it are discarded. */
  uLevelY: { value: number }
  /** Seconds (ambient motion, keeps moving when the scroll stops). */
  uTime: { value: number }
  /** Vacuum boil strength 0..1. */
  uBoil: { value: number }
  /** Pour ripple strength 0..1 (rings and a mound around the stream impact while pouring). */
  uPour: { value: number }
  uFoamColor: { value: THREE.Color }
}

export interface InvestmentUniforms extends InvestmentSharedUniforms {
  /** 1 = discard above the level (body), 0 = never (surface, stream). */
  uClip: { value: number }
  /** 1 = surface disc: vertex ripple / boil displacement and foam. */
  uSurface: { value: number }
  /** 1 = pour stream: narrowing and wobble along its length. */
  uStream: { value: number }
  /** Current stream mesh length in world units (the mesh is a unit cylinder scaled in Y). */
  uStreamLen: { value: number }
  /** World distance from STREAM_TOP_Y down to the mesh top (non-zero while the stream retracts). */
  uStreamStart: { value: number }
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

const f = (v: number) => v.toFixed(4)
const PP = pourPoint()

const VERTEX_PARS = [
  '#include <common>',
  'uniform float uTime;',
  'uniform float uBoil;',
  'uniform float uPour;',
  'uniform float uSurface;',
  'uniform float uStream;',
  'uniform float uStreamLen;',
  'uniform float uStreamStart;',
  'varying float vInvWorldY;',
  'varying float vInvFoam;',
  `#define INV_RADIUS ${f(INVESTMENT_RADIUS)}`,
  `#define INV_POUR vec2(${f(PP.x)}, ${f(PP.z)})`,
  `#define INV_FALL ${f(STREAM_TOP_Y - MOLD.investment.bottomY)}`,
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
  // Boil: big, slow blobs that rise and sag (low-frequency noise drifting in time), 0..1.
  'float invBlob(vec2 p) {',
  '  float n = 0.7 * invNoise(vec3(p * 2.2, uTime * 0.35)) + 0.3 * invNoise(vec3(p * 4.6 + 7.3, uTime * 0.55));',
  '  return smoothstep(0.4, 0.75, n);',
  '}',
  'float invMound(vec2 p) {',
  '  vec2 d = p - INV_POUR;',
  '  return exp(-dot(d, d) * 40.0);',
  '}',
  // Surface height at disc point p (object XZ): calm swell, pour rings + mound at the impact, boil blobs.
  'float invSurfaceHeight(vec2 p) {',
  '  float t = uTime;',
  `  float calm = ${f(CALM_AMP)} * (sin(p.x * 1.7 + t * 0.55) + sin(p.y * 1.4 - t * 0.45) + 0.5 * sin((p.x - p.y) * 2.3 + t * 0.7));`,
  '  float d = length(p - INV_POUR);',
  `  float rings = ${f(POUR_RING_AMP)} * sin(d * 11.0 - t * 3.2) * exp(-d * 1.4);`,
  `  float mound = ${f(MOUND_AMP)} * invMound(p) * (1.0 + 0.25 * sin(t * 2.5));`,
  `  float boil = ${f(BOIL_AMP)} * (invBlob(p) - 0.15);`,
  '  return calm + uPour * (rings + mound) + uBoil * boil;',
  '}',
].join('\n')

// Runs right after objectNormal is declared and before begin_vertex declares `transformed`.
const VERTEX_SURFACE = [
  '#include <beginnormal_vertex>',
  'float invDisp = 0.0;',
  'vInvFoam = 0.0;',
  'if (uSurface > 0.5) {',
  '  vec2 invP = position.xz;',
  '  float invR = length(invP) / INV_RADIUS;',
  '  // Calm at the wall so the disc edge meets the body cut and the steel cleanly.',
  '  float invFade = 1.0 - smoothstep(0.8, 1.0, invR);',
  '  float invE = 0.01;',
  '  float invH0 = invSurfaceHeight(invP);',
  '  float invHx = invSurfaceHeight(invP + vec2(invE, 0.0));',
  '  float invHz = invSurfaceHeight(invP + vec2(0.0, invE));',
  '  invDisp = invH0 * invFade;',
  '  objectNormal = normalize(vec3(-(invHx - invH0) * invFade / invE, 1.0, -(invHz - invH0) * invFade / invE));',
  '  vInvFoam = uBoil * smoothstep(0.5, 1.0, invBlob(invP)) + uPour * 0.8 * invMound(invP);',
  '}',
].join('\n')

const VERTEX_DISPLACE = [
  '#include <begin_vertex>',
  'transformed.y += invDisp;',
  'if (uStream > 0.5) {',
  '  // Unit cylinder from y = 0 (top) to y = -1 (bottom). invFall: world distance below the pour origin.',
  '  float invFall = uStreamStart + clamp(-position.y, 0.0, 1.0) * uStreamLen;',
  '  float invK = clamp(invFall / INV_FALL, 0.0, 1.0);',
  '  // Narrows a little as it speeds up; slow bulges travel down it (thick slurry, not a water jet).',
  '  transformed.xz *= mix(1.0, 0.78, sqrt(invK)) * (1.0 + 0.07 * sin(invFall * 3.0 - uTime * 6.0));',
  '  transformed.xz += vec2(sin(invFall * 1.6 - uTime * 2.4), cos(invFall * 1.3 - uTime * 2.0)) * 0.012 * invK;',
  '}',
].join('\n')

// Computed directly (worldpos_vertex only defines `worldPosition` under some defines).
const VERTEX_WORLD_Y = '#include <worldpos_vertex>\nvInvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;'

const FRAGMENT_PARS = [
  '#include <common>',
  'uniform float uLevelY;',
  'uniform float uClip;',
  'uniform float uSurface;',
  'uniform vec3 uFoamColor;',
  'uniform float uXray;',
  'uniform float uHeat;',
  'uniform vec3 uHeatColor;',
  'varying float vInvWorldY;',
  'varying float vInvFoam;',
  'float xrayDither() { return fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); }',
].join('\n')

const FRAGMENT_CLIP =
  '#include <clipping_planes_fragment>\nif (uClip > 0.5 && vInvWorldY > uLevelY) discard;\nif (uXray > 0.001 && xrayDither() < uXray) discard;'

const FRAGMENT_FOAM = [
  '#include <color_fragment>',
  'diffuseColor.rgb = mix(diffuseColor.rgb, uFoamColor, uSurface * clamp(vInvFoam, 0.0, 1.0));',
].join('\n')

// Runs right before opaque_fragment: `normal`, `vViewPosition`, `reflectedLight` and `outgoingLight` are in scope.
const FRAGMENT_FINISH = [
  '{',
  '  // Soft sheen: a little extra diffuse light toward the silhouette (wet slurry), no specular gloss.',
  '  float invSheen = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);',
  `  outgoingLight += ${f(SHEEN)} * invSheen * (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse);`,
  '  outgoingLight = mix(outgoingLight, outgoingLight * vec3(1.0, 0.62, 0.45), uHeat * 0.5) + uHeatColor * uHeat * 0.12;',
  '}',
  '#include <opaque_fragment>',
].join('\n')

interface PartConfig {
  side: THREE.Side
  roughness: number
  clip: number
  surface: number
  stream: number
}

const PARTS: Record<InvestmentPart, PartConfig> = {
  // The opaque flask hides the inside: front faces cut at the level are all the body needs.
  body: { side: THREE.FrontSide, roughness: INVESTMENT_ROUGHNESS, clip: 1, surface: 0, stream: 0 },
  // Double-sided in case a camera ever glimpses it from below through a hole.
  surface: { side: THREE.DoubleSide, roughness: INVESTMENT_ROUGHNESS, clip: 0, surface: 1, stream: 0 },
  stream: { side: THREE.FrontSide, roughness: STREAM_ROUGHNESS, clip: 0, surface: 0, stream: 1 },
  // The funnel wall the crucible former leaves: seen from both sides (inside in X-ray, outside after the flip).
  funnel: { side: THREE.DoubleSide, roughness: INVESTMENT_ROUGHNESS, clip: 0, surface: 0, stream: 0 },
}

/**
 * Investment (opaque milk-white, MeshStandardMaterial, no transmission). Every part injects the same source and uses
 * the same program key; parts differ only by uniforms and material flags:
 * - body: the liquid column, cut at the shared world level uLevelY.
 * - surface: the disc at the level, calm swell, pour rings and a mound at the stream impact, slow boil blobs.
 * - stream: the pour from the side, a unit cylinder scaled to the current span.
 * - funnel: the funnel wall the crucible former leaves in the bottom, double sided, never clipped.
 * Every part dissolves (screen-door) by the shared furnace xrayUniform and takes the furnace heat tint.
 */
export function createInvestmentMaterial(
  part: InvestmentPart,
  shared: InvestmentSharedUniforms = createInvestmentUniforms(),
): InvestmentMaterialHandle {
  const cfg = PARTS[part]
  const uniforms: InvestmentUniforms = {
    ...shared,
    uClip: { value: cfg.clip },
    uSurface: { value: cfg.surface },
    uStream: { value: cfg.stream },
    uStreamLen: { value: 1 },
    uStreamStart: { value: 0 },
  }
  const color = new THREE.Color(INVESTMENT_COLOR)
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.38,
    metalness: 0,
    roughness: cfg.roughness,
    envMapIntensity: 0.7,
    side: cfg.side,
  })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.uniforms.uXray = xrayUniform
    shader.uniforms.uHeat = heatUniforms.uHeat
    shader.uniforms.uHeatColor = heatUniforms.uHeatColor
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
  material.customProgramCacheKey = () => 'investment-v3'
  return { material, uniforms }
}
