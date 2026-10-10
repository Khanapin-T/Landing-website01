import * as THREE from 'three'
import { FINAL, HERO_SLOT, LINE_NORMAL } from '../../config/birth'
import { DIRT_GLSL, DIRT_SEEDS, DIRT_SURFACE_GLSL, RAW_CLEAN, RAW_GOLD, dirtColorGLSL } from '../../scene/gold/rawGoldMaterial'

/** Mirror-polished yellow gold (after the polish line). */
export const POLISHED_GOLD = { color: '#f1c66e', roughness: 0.1, envMapIntensity: 1.35 } as const

export interface PolishUniforms {
  /** A world point on the moving line (config/birth.ts polishLinePoint). */
  uLinePoint: { value: THREE.Vector3 }
  /** Unit normal of the split plane, pointing to the polished side. */
  uLineNormal: { value: THREE.Vector3 }
  /** 1 = polished everywhere (after the pass, so the spinning ring never shows raw again). */
  uAll: { value: number }
  /** 0..1 strength of the reflection copy (it fades to black, not to transparent). */
  uReflect: { value: number }
  /** IBL factor of the polished side: 1, up to FINAL.envBoost in the final frame (the raw side keeps its own). */
  uBoost: { value: number }
  /** The raw side's dirt seed (the hero slot's, as on the tree in Act 6, see rawGoldMaterial.ts DIRT_SEEDS). */
  uDirtSeed: { value: number }
  /** The acid clean-up of the raw side: rawGoldMaterial.ts RAW_CLEAN itself (shared with the tree and the cut rings). */
  uRawClean: { value: number }
}

type Variant = 'ring' | 'stub' | 'mirror'

function create(variant: Variant, uniforms: PolishUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    metalness: 1,
    roughness: RAW_GOLD.roughness,
    envMapIntensity: POLISHED_GOLD.envMapIntensity,
    // All variants are opaque. The mirror copy fades to black (outgoing light scaled), not to transparent: it only shows
    // over the black page after the sweep, and blending would let the inner honeycomb show through the outer surface.
    // FrontSide also for the mirror: three flips the winding for its negative-determinant matrix.
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  })
  const raw = new THREE.Color(RAW_GOLD.color)
  const pol = new THREE.Color(POLISHED_GOLD.color)
  const v3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`
  // envMapIntensity is POLISHED_GOLD's; the raw side scales the IBL back down to RAW_GOLD's (as the cut rings), the
  // polished side up by uBoost in the final frame.
  // With scene.environment three ignores material.envMapIntensity (the cast rings and the tree render at the scene's
  // factor 1), so the raw side must not be scaled down or the hero ring is darker than the other rings.
  const rawEnv = (1).toFixed(5)
  const envScale = variant === 'stub' ? rawEnv : `mix(${rawEnv}, uBoost, polished)`
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPolishWorld;\nvarying vec3 vPolishObj;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvPolishObj = position;\nvPolishWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uLinePoint;
        uniform vec3 uLineNormal;
        uniform float uAll;
        uniform float uReflect;
        uniform float uBoost;
        varying vec3 vPolishWorld;
        varying vec3 vPolishObj;
        float pgGrain(vec3 p) { return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        ${DIRT_GLSL}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float polished = max(step(0.0, dot(vPolishWorld - uLinePoint, uLineNormal)), uAll);
        ${variant === 'stub' ? 'if (polished > 0.5) discard;' : ''}
        float grain = pgGrain(vPolishObj * 220.0);
        diffuseColor.rgb = mix(${v3(raw)} * (0.9 + 0.12 * grain), ${v3(pol)}, polished);
        ${dirtColorGLSL('vPolishObj', '(1.0 - polished)')}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(clamp(${RAW_GOLD.roughness.toFixed(3)} + 0.08 * (grain - 0.5), 0.0, 1.0), mix(${POLISHED_GOLD.roughness.toFixed(3)}, ${FINAL.roughness.toFixed(3)}, clamp((uBoost - 1.0) / ${(FINAL.envBoost - 1).toFixed(4)}, 0.0, 1.0)), polished);
        ${DIRT_SURFACE_GLSL.roughness}`,
      )
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${DIRT_SURFACE_GLSL.metalness}`)
      .replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>
        float pgEnv = ${envScale};
        radiance *= pgEnv;
        iblIrradiance *= pgEnv;`,
      )
    if (variant === 'mirror')
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `outgoingLight *= uReflect * ${FINAL.reflectStrength.toFixed(4)} * (1.0 - smoothstep(0.0, ${FINAL.reflectFade.toFixed(4)}, ${FINAL.mirrorY.toFixed(4)} - vPolishWorld.y));
        #include <opaque_fragment>`,
      )
  }
  m.customProgramCacheKey = () => `polish-gold-${variant}-v7`
  return m
}

/**
 * The hero ring's materials (Act 7): raw as-cast gold on one side of the moving polish plane (through
 * uLinePoint, normal uLineNormal), mirror-polished gold on the other; uAll polishes everything. `stub` discards the
 * sprue stub on the polished side (it vanishes where the line has passed); `mirror` is the reflection copy under the
 * ring, opaque and faded to black (uReflect); uBoost brightens the polished gold in the final frame. The raw side
 * carries the same post-casting dirt as the tree and the cut rings (rawGoldMaterial.ts DIRT_GLSL, cleaned by RAW_CLEAN
 * in the acid); the polished side never does. One shared
 * uniforms object; uniforms only, so each variant compiles once.
 */
export function createPolishMaterials() {
  const uniforms: PolishUniforms = {
    uLinePoint: { value: new THREE.Vector3(1e3, 0, 0) },
    uLineNormal: { value: LINE_NORMAL.clone() },
    uAll: { value: 0 },
    uReflect: { value: 0 },
    uBoost: { value: 1 },
    uDirtSeed: { value: DIRT_SEEDS.slots[HERO_SLOT] },
    uRawClean: RAW_CLEAN,
  }
  return { ring: create('ring', uniforms), stub: create('stub', uniforms), mirror: create('mirror', uniforms), uniforms }
}
