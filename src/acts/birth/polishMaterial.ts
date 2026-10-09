import * as THREE from 'three'
import { FINAL, LINE_NORMAL } from '../../config/birth'
import { RAW_GOLD } from '../../scene/gold/rawGoldMaterial'

/** Mirror-polished yellow gold (after the polish line). */
export const POLISHED_GOLD = { color: '#f1c66e', roughness: 0.1, envMapIntensity: 1.35 } as const

export interface PolishUniforms {
  /** A world point on the moving line (config/birth.ts polishLinePoint). */
  uLinePoint: { value: THREE.Vector3 }
  /** Unit normal of the split plane, pointing to the polished side. */
  uLineNormal: { value: THREE.Vector3 }
  /** 1 = polished everywhere (after the pass, so the spinning ring never shows raw again). */
  uAll: { value: number }
  /** 0..1 opacity of the reflection copy. */
  uReflect: { value: number }
}

type Variant = 'ring' | 'stub' | 'mirror'

function create(variant: Variant, uniforms: PolishUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    metalness: 1,
    roughness: RAW_GOLD.roughness,
    envMapIntensity: POLISHED_GOLD.envMapIntensity,
    transparent: variant === 'mirror',
    depthWrite: variant !== 'mirror',
    side: variant === 'mirror' ? THREE.DoubleSide : THREE.FrontSide,
  })
  const raw = new THREE.Color(RAW_GOLD.color)
  const pol = new THREE.Color(POLISHED_GOLD.color)
  const v3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`
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
        varying vec3 vPolishWorld;
        varying vec3 vPolishObj;
        float pgGrain(vec3 p) { return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float polished = max(step(0.0, dot(vPolishWorld - uLinePoint, uLineNormal)), uAll);
        ${variant === 'stub' ? 'if (polished > 0.5) discard;' : ''}
        float grain = pgGrain(vPolishObj * 220.0);
        diffuseColor.rgb = mix(${v3(raw)} * (0.9 + 0.12 * grain), ${v3(pol)}, polished);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(clamp(${RAW_GOLD.roughness.toFixed(3)} + 0.08 * (grain - 0.5), 0.0, 1.0), ${POLISHED_GOLD.roughness.toFixed(3)}, polished);`,
      )
    if (variant === 'mirror')
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `diffuseColor.a = uReflect * 0.32 * (1.0 - smoothstep(0.0, 0.9, ${FINAL.mirrorY.toFixed(4)} - vPolishWorld.y));
        #include <opaque_fragment>`,
      )
  }
  m.customProgramCacheKey = () => `polish-gold-${variant}-v1`
  return m
}

/**
 * The hero ring's materials (Act 7): raw as-cast gold on one side of the moving polish plane (through
 * uLinePoint, normal uLineNormal), mirror-polished gold on the other; uAll polishes everything. `stub` discards the
 * sprue stub on the polished side (it vanishes where the line has passed); `mirror` is the faded reflection copy
 * under the ring. One shared uniforms object; uniforms only, so each variant compiles once.
 */
export function createPolishMaterials() {
  const uniforms: PolishUniforms = {
    uLinePoint: { value: new THREE.Vector3(1e3, 0, 0) },
    uLineNormal: { value: LINE_NORMAL.clone() },
    uAll: { value: 0 },
    uReflect: { value: 0 },
  }
  return { ring: create('ring', uniforms), stub: create('stub', uniforms), mirror: create('mirror', uniforms), uniforms }
}
