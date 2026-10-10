import * as THREE from 'three'

/** As-cast yellow gold: strongly matte and rough (the author: it only shines after processing and polishing). */
export const RAW_GOLD = { color: '#c49a4c', roughness: 0.86, envMapIntensity: 0.75 } as const

/**
 * The dark oxide / investment residue on the gold right after casting (the author, 2026-10-10: darkening over the
 * whole tree and on the rings in random places, gone after the acid). A mix of large soft blotches (three octaves of
 * value noise) and small specks (one fine octave) in object space, about a quarter to a third of the surface.
 * `light`..`dark` = patch colour from its edge to its core, `roughness` / `metalness` = the dull patch surface,
 * `opacity` = how much the patch covers the gold at full dirt. `freq` in cycles per world unit (ring height = 1);
 * `blot` / `speck` = the smoothstep edges on the blotch fbm and the speck noise; `erode` = how far those edges rise as
 * the acid cleans (the patches shrink while they fade). Tuned by test (coverage) + eye.
 */
export const DIRT = {
  dark: '#2b2018',
  light: '#4a3826',
  roughness: 0.97,
  metalness: 0.55,
  opacity: 0.92,
  freq: [3.5, 7.3, 15.1] as const,
  speckFreq: 38,
  blot: [0.53, 0.63] as const,
  speck: [0.78, 0.86] as const,
  speckStrength: 0.8,
  erode: 0.3,
} as const

/**
 * One dirt seed per raw piece, so no two show the same pattern: `tree` = trunk, funnel (RawTree and BirthTree, the
 * same pattern in both acts), `slots[i]` = ring i of the tree with its sprue and trunk stub (Act 6 TreeShapes, Act 7
 * CutRings / PolishRing for the hero slot), so the hand-over at the cut is invisible.
 */
export const DIRT_SEEDS = { tree: 0.37, slots: [7.29, 3.43, 9.53, 2.63] as const } as const

/**
 * The shared "cleaned by the acid" uniform of every raw gold material: 0 = dirty (as cast, Acts 6 and 7 before the
 * acid), 1 = clean matte gold. Written once per frame by BirthScene from birth.rest (rawCleanOf).
 */
export const RAW_CLEAN: { value: number } = { value: 0 }

/** The acid rest progress (birth.rest 0..1) to RAW_CLEAN: the dirt fades across the middle of the rest. */
export function rawCleanOf(rest: number): number {
  const t = Math.min(Math.max((rest - 0.08) / (0.85 - 0.08), 0), 1)
  return t * t * (3 - 2 * t)
}

const f = (n: number) => n.toFixed(4)
const v3 = (hex: string) => {
  const c = new THREE.Color(hex)
  return `vec3(${f(c.r)}, ${f(c.g)}, ${f(c.b)})`
}

/**
 * GLSL for the fragment `#include <common>` section of every raw gold material (rawGoldMaterial and the hero ring's
 * polish material): the seed and clean uniforms, the value noise and gdDirt(p) = (amount 0..1, core tone 0..1).
 * dirtAt below mirrors it.
 */
export const DIRT_GLSL = `
uniform float uDirtSeed;
uniform float uRawClean;
float gdK = 0.0;
float gdHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float gdNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 u = fract(x);
  u = u * u * (3.0 - 2.0 * u);
  return mix(
    mix(mix(gdHash(i), gdHash(i + vec3(1.0, 0.0, 0.0)), u.x), mix(gdHash(i + vec3(0.0, 1.0, 0.0)), gdHash(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
    mix(mix(gdHash(i + vec3(0.0, 0.0, 1.0)), gdHash(i + vec3(1.0, 0.0, 1.0)), u.x), mix(gdHash(i + vec3(0.0, 1.0, 1.0)), gdHash(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
    u.z);
}
vec2 gdDirt(vec3 p) {
  vec3 q = p + uDirtSeed * vec3(13.17, 7.31, 11.53);
  float e = uRawClean * ${f(DIRT.erode)};
  float blot = 0.5 * gdNoise(q * ${f(DIRT.freq[0])}) + 0.3 * gdNoise(q * ${f(DIRT.freq[1])} + 3.1) + 0.2 * gdNoise(q * ${f(DIRT.freq[2])} + 7.7);
  float speck = gdNoise(q * ${f(DIRT.speckFreq)} + 19.3);
  float big = smoothstep(${f(DIRT.blot[0])} + e, ${f(DIRT.blot[1])} + e, blot);
  float small = ${f(DIRT.speckStrength)} * smoothstep(${f(DIRT.speck[0])} + e, ${f(DIRT.speck[1])} + e, speck);
  float tone = max(smoothstep(${f(DIRT.blot[1])}, ${f(DIRT.blot[1] + 0.12)}, blot), small);
  return vec2(max(big, small) * (1.0 - uRawClean), tone);
}
`

/**
 * GLSL after `#include <color_fragment>`: darkens diffuseColor with the dirt at object-space position `pos`, scaled
 * by `mask` (1 = raw surface; the polish material passes its raw side), and leaves the amount in gdK for
 * DIRT_SURFACE_GLSL. Skipped entirely once the acid has cleaned everything (uniform branch, no cost after the rest).
 */
export function dirtColorGLSL(pos: string, mask = '1.0'): string {
  return `
  if (uRawClean < 1.0 && ${mask} > 0.0) {
    vec2 gd = gdDirt(${pos});
    gdK = gd.x * ${mask};
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(${v3(DIRT.light)}, ${v3(DIRT.dark)}, gd.y), gdK * ${f(DIRT.opacity)});
  }`
}

/** GLSL after the roughness / metalness chunks: the patches are dull (rougher, less metallic). */
export const DIRT_SURFACE_GLSL = {
  roughness: `roughnessFactor = mix(roughnessFactor, ${f(DIRT.roughness)}, gdK);`,
  metalness: `metalnessFactor = mix(metalnessFactor, ${f(DIRT.metalness)}, gdK);`,
} as const

const fract = (x: number) => x - Math.floor(x)
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}
function hash(x: number, y: number, z: number): number {
  const a = fract(x * 0.3183099 + 0.1) * 17
  const b = fract(y * 0.3183099 + 0.1) * 17
  const c = fract(z * 0.3183099 + 0.1) * 17
  return fract(a * b * c * (a + b + c))
}
function noise(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const s = (t: number) => t * t * (3 - 2 * t)
  const ux = s(x - ix)
  const uy = s(y - iy)
  const uz = s(z - iz)
  const h = (a: number, b: number, c: number) => hash(ix + a, iy + b, iz + c)
  const mix = (a: number, b: number, t: number) => a + (b - a) * t
  return mix(
    mix(mix(h(0, 0, 0), h(1, 0, 0), ux), mix(h(0, 1, 0), h(1, 1, 0), ux), uy),
    mix(mix(h(0, 0, 1), h(1, 0, 1), ux), mix(h(0, 1, 1), h(1, 1, 1), ux), uy),
    uz,
  )
}

/** The dirt amount (gdDirt(p).x) at object-space point (x, y, z): the JS mirror of DIRT_GLSL, for tests. */
export function dirtAt(x: number, y: number, z: number, seed: number, clean = 0): number {
  const qx = x + seed * 13.17
  const qy = y + seed * 7.31
  const qz = z + seed * 11.53
  const e = clean * DIRT.erode
  const o = (k: number, off = 0) => noise(qx * k + off, qy * k + off, qz * k + off)
  const blot = 0.5 * o(DIRT.freq[0]) + 0.3 * o(DIRT.freq[1], 3.1) + 0.2 * o(DIRT.freq[2], 7.7)
  const speck = o(DIRT.speckFreq, 19.3)
  const big = smooth(DIRT.blot[0] + e, DIRT.blot[1] + e, blot)
  const small = DIRT.speckStrength * smooth(DIRT.speck[0] + e, DIRT.speck[1] + e, speck)
  return Math.max(big, small) * (1 - clean)
}

/**
 * MeshStandardMaterial for the raw cast gold (the tree and the cut rings): matte metal with a fine object-space grain
 * on the albedo and the roughness (so it reads cast, not satin), and the post-casting dirt (DIRT) with this piece's
 * `seed` (DIRT_SEEDS), cleaned by RAW_CLEAN. The seed and the clean value are uniforms: every raw material shares one
 * compiled program.
 */
export function createRawGoldMaterial(seed: number): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: RAW_GOLD.color,
    metalness: 1,
    roughness: RAW_GOLD.roughness,
    envMapIntensity: RAW_GOLD.envMapIntensity,
  })
  const uDirtSeed = { value: seed }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDirtSeed = uDirtSeed
    shader.uniforms.uRawClean = RAW_CLEAN
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObj;
        float rgGrain(vec3 p) { return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        ${DIRT_GLSL}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float grain = rgGrain(vObj * 220.0);
        diffuseColor.rgb *= 0.9 + 0.12 * grain;
        ${dirtColorGLSL('vObj')}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + 0.08 * (grain - 0.5), 0.0, 1.0);
        ${DIRT_SURFACE_GLSL.roughness}`,
      )
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${DIRT_SURFACE_GLSL.metalness}`)
  }
  m.customProgramCacheKey = () => 'raw-gold-v2'
  return m
}

/** The raw tree's materials: `tree` (trunk, funnel) and one per slot (ring, sprue, trunk stub), see DIRT_SEEDS. */
export function createRawTreeMaterials() {
  return {
    tree: createRawGoldMaterial(DIRT_SEEDS.tree),
    slots: DIRT_SEEDS.slots.map((s) => createRawGoldMaterial(s)),
  }
}
