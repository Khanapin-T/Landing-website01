import * as THREE from 'three'

/** CAD surface color: pale blueprint grey-blue (tuned in integration). */
export const CAD_COLOR = '#b9cadc'

export interface RingMaterialHandle {
  material: THREE.MeshStandardMaterial
  uniforms: { uCad: { value: number }; uCadColor: { value: THREE.Color } }
}

/**
 * The persistent ring material. States are uniforms only, so no state change ever recompiles:
 * - uCad 0 = polished yellow gold, 1 = matte CAD surface.
 * - material.opacity = surface fill, rendered with alpha hashing (opaque pipeline, no sorting artifacts;
 *   the film grain hides the dither).
 * Later sessions add resin, void, molten and raw-gold states here.
 */
export function createRingMaterial(): RingMaterialHandle {
  const uniforms = { uCad: { value: 0 }, uCadColor: { value: new THREE.Color(CAD_COLOR) } }
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e3b04b'),
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: 1.1,
    alphaHash: true,
    // Edge lines sit exactly on the surface: push the surface back so the lines win the depth test.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCad = uniforms.uCad
    shader.uniforms.uCadColor = uniforms.uCadColor
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uCad;\nuniform vec3 uCadColor;\n#define CAD_ROUGHNESS 0.62')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uCadColor, uCad);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, CAD_ROUGHNESS, uCad);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, uCad);')
  }
  material.customProgramCacheKey = () => 'ring-states-v1'
  return { material, uniforms }
}
