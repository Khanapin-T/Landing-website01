import * as THREE from 'three'

/**
 * As-cast yellow gold, clean and strongly matte (the author: it only shines after processing and polishing). The
 * colour is the pale satin yellow of his cast-tree reference photos, lighter than the first draft; roughness is
 * unchanged. `boost` scales the image-based light (lighter, still matte). No tarnish or dirt: the metal is clean.
 */
export const RAW_GOLD = { color: '#f6d65c', roughness: 0.86, envMapIntensity: 0.75, boost: 2.3 } as const

/**
 * The tree and the rings on it are as-cast: a little darker than the clean ring that comes out of the acid (the author).
 * `dark` scales the albedo (the specular colour of the metal) at uClean = 0; the acid cleans it up to the RAW_GOLD
 * colour (uClean = 1, the look the ring has after the acid).
 */
export const CAST_DARK = 0.76

/** GLSL factor of the as-cast darkening for a cleanness value `uClean` (0 = as cast, 1 = clean). */
export const CAST_FACTOR_GLSL = `mix(${CAST_DARK.toFixed(3)}, 1.0, clamp(uClean, 0.0, 1.0))`

/** 0..1 cleanness for the acid progress `rest` (0..1): clean before the ring leaves the acid. */
export function cleanOf(rest: number): number {
  const t = Math.min(Math.max(rest / 0.8, 0), 1)
  return t * t * (3 - 2 * t)
}

/** GLSL that applies RAW_GOLD.boost to the image-based light; shared with the hero ring's raw side (polishMaterial.ts uses the number). */
const RAW_BOOST_GLSL = `radiance *= ${RAW_GOLD.boost.toFixed(4)};\niblIrradiance *= ${RAW_GOLD.boost.toFixed(4)};`

/**
 * MeshStandardMaterial for the raw tree and rings: matte metal with a fine object-space grain on the albedo and the
 * roughness (so it reads cast, not satin).
 */
export function createRawGoldMaterial(clean: { value: number } = { value: 0 }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: RAW_GOLD.color,
    metalness: 1,
    roughness: RAW_GOLD.roughness,
    envMapIntensity: RAW_GOLD.envMapIntensity,
  })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uClean = clean
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObj;
        uniform float uClean;
        float rgGrain(vec3 p) { return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float grain = rgGrain(vObj * 220.0);
        diffuseColor.rgb *= (0.9 + 0.12 * grain) * ${CAST_FACTOR_GLSL};`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + 0.08 * (grain - 0.5), 0.0, 1.0);',
      )
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>\n${RAW_BOOST_GLSL}`)
  }
  m.customProgramCacheKey = () => 'raw-gold-v4'
  return m
}
