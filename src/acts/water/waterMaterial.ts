import * as THREE from 'three'

export interface WaterUniforms {
  uBoil: { value: number }
  /** 0..1 how far the boil has spread from the middle (config/water.ts immersion). */
  uSpread: { value: number }
  /** Radius of the water disc, world units. */
  uRadius: { value: number }
  uMilk: { value: number }
  uTime: { value: number }
}

/** Dark water (opaque: nothing under the surface shows) and the milky white the dissolved investment gives it. */
export const WATER_COLORS = { clear: '#15303c', milk: '#e9e5da' } as const

/** Height of the boil in world units at uBoil = 1. */
export const BOIL_HEIGHT = 0.07

// Value noise and the boil height field, shared by the vertex (displacement + normal) and fragment (foam) stages.
const BOIL_GLSL = /* glsl */ `
uniform float uBoil;
uniform float uSpread;
uniform float uRadius;
uniform float uMilk;
uniform float uTime;
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// 0..1 boil field: rolling bumps that rise and fall quickly (ambient on time; frozen when uTime is held at 0).
float boilField(vec2 xz) {
  float a = wNoise(xz * 2.3 + vec2(0.0, uTime * 1.7));
  float b = wNoise(xz * 4.1 - vec2(uTime * 2.3, 0.0));
  return a * 0.65 + b * 0.35;
}
// Boil strength at a point: uBoil inside a disc that spreads from the middle with uSpread (soft edge).
float boilAmount(vec2 xz) {
  float r = uSpread * (uRadius + 0.6);
  return uBoil * (1.0 - smoothstep(r - 0.6, r, length(xz)));
}
`

/**
 * The water surface (Act 6): MeshStandardMaterial on a flat disc in the XZ plane (normal +Y). `uBoil` raises bumps
 * (vertex displacement, normals from finite differences of the same field) and adds foam inside a disc that spreads
 * from the middle with `uSpread`, `uMilk` blends the color
 * and the roughness from dark clear water to milky white. Opaque: the flask under the water does not show (no
 * transmission). The caller writes the uniforms every frame.
 */
export function createWaterMaterial(): { material: THREE.MeshStandardMaterial; uniforms: WaterUniforms } {
  const uniforms: WaterUniforms = { uBoil: { value: 0 }, uSpread: { value: 0 }, uRadius: { value: 1 }, uMilk: { value: 0 }, uTime: { value: 0 } }
  const material = new THREE.MeshStandardMaterial({ color: WATER_COLORS.clear, roughness: 0.12, metalness: 0, envMapIntensity: 1 })
  const clear = new THREE.Color(WATER_COLORS.clear)
  const milk = new THREE.Color(WATER_COLORS.milk)
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { uClear: { value: clear }, uMilkColor: { value: milk } })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${BOIL_GLSL}\nvarying vec2 vXZ;\n#define BOIL_HEIGHT ${BOIL_HEIGHT.toFixed(4)}`)
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        {
          float e = 0.03;
          float hx = (boilField(position.xz + vec2(e, 0.0)) - boilField(position.xz - vec2(e, 0.0))) / (2.0 * e);
          float hz = (boilField(position.xz + vec2(0.0, e)) - boilField(position.xz - vec2(0.0, e))) / (2.0 * e);
          float k = BOIL_HEIGHT * boilAmount(position.xz);
          objectNormal = normalize(vec3(-hx * k, 1.0, -hz * k));
        }`,
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvXZ = position.xz;\ntransformed.y += BOIL_HEIGHT * boilAmount(position.xz) * boilField(position.xz);',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${BOIL_GLSL}\nuniform vec3 uClear;\nuniform vec3 uMilkColor;\nvarying vec2 vXZ;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float foam = smoothstep(0.62, 0.8, boilField(vXZ * 1.6)) * boilAmount(vXZ);
          diffuseColor.rgb = mix(mix(uClear, uMilkColor, uMilk), uMilkColor, foam * 0.8);
        }`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.12, 0.6, uMilk);')
  }
  material.customProgramCacheKey = () => 'water-surface-v2'
  return { material, uniforms }
}
