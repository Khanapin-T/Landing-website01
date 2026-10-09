import * as THREE from 'three'
import { MOLD } from '../../config/mold'

/** As-cast yellow gold: strongly matte and rough (the author: it only shines after processing and polishing). */
export const RAW_GOLD = { color: '#c49a4c', roughness: 0.86, envMapIntensity: 0.75 } as const

/**
 * The one tarnish patch (the author: rare, one small place on the sprue only): trunk-local position (origin at the
 * trunk bottom, see scene/tree/trunk.ts) on the +Z side, a third of the way up; `radius` in world units.
 */
export const TARNISH = {
  center: [0, (MOLD.trunk.topY - MOLD.trunk.bottomY) * 0.3, MOLD.trunk.radius] as [number, number, number],
  radius: 0.16,
  color: '#5b4632',
} as const

/**
 * MeshStandardMaterial for the raw tree: matte metal with a fine object-space grain on the albedo and the roughness
 * (so it reads cast, not satin). `tarnish` = the trunk variant with the one dark mottled patch around TARNISH.center.
 */
export function createRawGoldMaterial(tarnish: boolean): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: RAW_GOLD.color,
    metalness: 1,
    roughness: RAW_GOLD.roughness,
    envMapIntensity: RAW_GOLD.envMapIntensity,
  })
  const [cx, cy, cz] = TARNISH.center
  const tc = new THREE.Color(TARNISH.color)
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
    const tarnishCode = tarnish
      ? `{
          float d = distance(vObj, vec3(${cx.toFixed(5)}, ${cy.toFixed(5)}, ${cz.toFixed(5)}));
          float k = (1.0 - smoothstep(${(TARNISH.radius * 0.45).toFixed(5)}, ${TARNISH.radius.toFixed(5)}, d)) * (0.55 + 0.45 * rgGrain(vObj * 60.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${tc.r.toFixed(4)}, ${tc.g.toFixed(4)}, ${tc.b.toFixed(4)}), k * 0.85);
          rgTarnish = k;
        }`
      : ''
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObj;
        float rgGrain(vec3 p) { return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float rgTarnish = 0.0;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float grain = rgGrain(vObj * 220.0);
        diffuseColor.rgb *= 0.9 + 0.12 * grain;
        ${tarnishCode}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + 0.08 * (grain - 0.5) + 0.1 * rgTarnish, 0.0, 1.0);',
      )
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.35, rgTarnish);')
  }
  m.customProgramCacheKey = () => (tarnish ? 'raw-gold-tarnish-v1' : 'raw-gold-v1')
  return m
}
