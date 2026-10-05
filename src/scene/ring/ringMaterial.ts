import * as THREE from 'three'
import { CURE_OFF, RESIN_COLOR } from '../../config/print'

/** CAD surface color: pale blueprint grey-blue (tuned in integration). */
export const CAD_COLOR = '#b9cadc'
/** Cure front glow (crosses the bloom threshold). */
export const FRONT_COLOR = '#dcffe9'
export const FRONT_INTENSITY = 3
/** Visual layer spacing in ring-local units (exaggerated for readability). */
export const LAYER_STEP = 0.012

export interface RingMaterialHandle {
  material: THREE.MeshStandardMaterial
  uniforms: {
    uCad: { value: number }
    uCadColor: { value: THREE.Color }
    uResin: { value: number }
    uCureY: { value: number }
    uResinColor: { value: THREE.Color }
    uFrontColor: { value: THREE.Color }
    uLayer: { value: number }
  }
}

const VERTEX_VARYINGS = '#include <common>\nvarying float vRingWorldY;\nvarying float vRingLocalY;'

// `transformed` is declared by begin_vertex, which runs before worldpos_vertex. The world Y is computed here
// directly because worldpos_vertex only defines `worldPosition` under some defines (env map, shadows, ...).
const VERTEX_WORLD_Y =
  '#include <worldpos_vertex>\nvRingWorldY = (modelMatrix * vec4(transformed, 1.0)).y;\nvRingLocalY = transformed.y;'

const FRAGMENT_PARS = [
  '#include <common>',
  'uniform float uCad;',
  'uniform vec3 uCadColor;',
  'uniform float uResin;',
  'uniform vec3 uResinColor;',
  'uniform float uCureY;',
  'uniform vec3 uFrontColor;',
  'uniform float uLayer;',
  'varying float vRingWorldY;',
  'varying float vRingLocalY;',
  '#define CAD_ROUGHNESS 0.62',
  '#define RESIN_ROUGHNESS 0.12',
].join('\n')

// Runs right before opaque_fragment: `normal` (view space, normal_fragment_begin), `vViewPosition` and
// `outgoingLight` are all in scope there, and tone mapping / color space conversion still follow.
const FRAGMENT_RESIN_AND_FRONT = [
  '{',
  '  // Resin: soft inner glow + fresnel rim instead of real transmission.',
  '  float resinFres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.0);',
  '  outgoingLight += uResin * mix(uResinColor, vec3(0.85, 1.0, 0.9), 0.5) * (0.05 + 0.75 * resinFres);',
  '  // Faint layer lines, fixed to the part: 1 at each layer boundary, 0 for the inner ~80% of a layer.',
  '  float layerT = vRingLocalY / uLayer;',
  '  float layerLine = smoothstep(0.8, 1.0, abs(fract(layerT) - 0.5) * 2.0);',
  '  // Fade the lines out where a layer gets thinner than ~4 px on screen (grazing angles, small ring): no moire.',
  '  layerLine *= 1.0 - smoothstep(0.25, 0.5, fwidth(layerT));',
  '  outgoingLight *= 1.0 - 0.1 * uResin * layerLine;',
  '  // Glowing cure front just above the cure plane (zero when the clip is off: CURE_OFF is far below).',
  '  float front = 1.0 - smoothstep(0.0, 0.03, vRingWorldY - uCureY);',
  '  outgoingLight += front * uFrontColor;',
  '}',
  '#include <opaque_fragment>',
].join('\n')

/**
 * The persistent ring material. States are uniforms only, so no state change ever recompiles:
 * - uCad 0 = polished yellow gold, 1 = matte CAD surface.
 * - uResin 1 = castable resin (mixed over gold/CAD): pale green, fresnel rim and soft glow, faint layer lines.
 * - uCureY = world Y of the print cure plane; everything below it is discarded and a glowing front sits on it.
 *   CURE_OFF disables both.
 * - material.opacity = surface fill, rendered with alpha hashing (opaque pipeline, no sorting artifacts;
 *   the film grain hides the dither).
 * Later sessions add void, molten and raw-gold states here.
 */
export function createRingMaterial(): RingMaterialHandle {
  const uniforms: RingMaterialHandle['uniforms'] = {
    uCad: { value: 0 },
    uCadColor: { value: new THREE.Color(CAD_COLOR) },
    uResin: { value: 0 },
    uCureY: { value: CURE_OFF },
    uResinColor: { value: new THREE.Color(RESIN_COLOR) },
    uFrontColor: { value: new THREE.Color(FRONT_COLOR).multiplyScalar(FRONT_INTENSITY) },
    uLayer: { value: LAYER_STEP },
  }
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
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERTEX_VARYINGS)
      .replace('#include <worldpos_vertex>', VERTEX_WORLD_Y)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAGMENT_PARS)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vRingWorldY < uCureY + 1e-4) discard;')
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uCadColor, uCad);\ndiffuseColor.rgb = mix(diffuseColor.rgb, uResinColor, uResin);',
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, CAD_ROUGHNESS, uCad);\nroughnessFactor = mix(roughnessFactor, RESIN_ROUGHNESS, uResin);',
      )
      .replace(
        '#include <metalnessmap_fragment>',
        '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, max(uCad, uResin));',
      )
      .replace('#include <opaque_fragment>', FRAGMENT_RESIN_AND_FRONT)
  }
  material.customProgramCacheKey = () => 'ring-states-v2'
  return { material, uniforms }
}
