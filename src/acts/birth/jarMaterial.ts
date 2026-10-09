import * as THREE from 'three'

/** Transparent pale-green acid (the author). */
export const ACID_COLOR = '#bfeaa8'

/**
 * Thin clear glass: low base opacity, more opaque toward grazing angles (fresnel), so the walls read as glass and
 * the rings show through. No transmission.
 */
export function createGlassMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: '#eef6f2',
    metalness: 0,
    roughness: 0.05,
    envMapIntensity: 1.4,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `{
        float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
        diffuseColor.a = clamp(diffuseColor.a + fr * 0.5, 0.0, 1.0);
      }
      #include <opaque_fragment>`,
    )
  }
  m.customProgramCacheKey = () => 'jar-glass-v1'
  return m
}

/** The acid body: pale green, see-through, a little glossy on top. */
export function createAcidMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: ACID_COLOR,
    metalness: 0,
    roughness: 0.15,
    envMapIntensity: 0.8,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  })
}
