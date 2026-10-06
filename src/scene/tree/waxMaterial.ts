import * as THREE from 'three'
import { BURN_PARS, burnDiscard, burnGlow, burnUniforms } from '../furnace/burn'

/** Red wax (the trunk). Burns away with the ring: fragments above the burn front are discarded, a hot band glows under it. */
export function createWaxMaterial(): THREE.MeshStandardMaterial {
  const wax = new THREE.MeshStandardMaterial({
    color: '#7a1620',
    roughness: 0.42,
    metalness: 0,
    envMapIntensity: 0.6,
    emissive: '#7a1620',
    emissiveIntensity: 0.04,
  })
  wax.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, burnUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWaxWorldY;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWaxWorldY = (modelMatrix * vec4(transformed, 1.0)).y;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vWaxWorldY;\n${BURN_PARS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${burnDiscard('vWaxWorldY')}`)
      .replace('#include <opaque_fragment>', `${burnGlow('vWaxWorldY')}\n#include <opaque_fragment>`)
  }
  wax.customProgramCacheKey = () => 'wax-burn-v1'
  return wax
}
