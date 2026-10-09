import * as THREE from 'three'
import { FLIP } from '../../config/fire'
import { FILL } from '../../config/gold'

/**
 * The solid metal of Act 5. GoldFill writes uFillY once per frame from story.flask.fill; the material holds these
 * objects by reference. FILL.off = nothing filled.
 */
export const goldFillUniforms = {
  uFillY: { value: FILL.off as number },
  /** HDR white-orange: crosses the bloom threshold. */
  uFillColor: { value: new THREE.Color(3.2, 1.7, 0.5) },
}

/**
 * Yellow gold (same color as the polished ring). Drawn under a fixed flip transform (Rz(pi) about the flask pivot), so
 * `vFillY` maps the world Y back to the flask frame in which the front is defined (config/gold.ts): fragments above the
 * front are discarded, a hot band glows just under it. The molten glow of the whole surface is the material's emissive,
 * written by GoldFill.
 */
export function createGoldMaterial(): THREE.MeshStandardMaterial {
  const gold = new THREE.MeshStandardMaterial({
    color: '#e3b04b',
    metalness: 1,
    roughness: 0.32,
    envMapIntensity: 1.1,
    emissive: new THREE.Color(0, 0, 0),
    side: THREE.DoubleSide,
  })
  gold.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, goldFillUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vFillY;')
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\nvFillY = 2.0 * ${FLIP.pivotY.toFixed(5)} - (modelMatrix * vec4(transformed, 1.0)).y;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying float vFillY;\nuniform float uFillY;\nuniform vec3 uFillColor;\n#define FILL_BAND ${FILL.band.toFixed(4)}`,
      )
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vFillY > uFillY) discard;')
      .replace(
        '#include <opaque_fragment>',
        '{ float fillBand = 1.0 - smoothstep(0.0, FILL_BAND, uFillY - vFillY); outgoingLight += uFillColor * fillBand * fillBand; }\n#include <opaque_fragment>',
      )
  }
  gold.customProgramCacheKey = () => 'gold-fill-v1'
  return gold
}
