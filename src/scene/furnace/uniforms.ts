import * as THREE from 'three'

/**
 * Furnace state shared by the flask and investment shaders. Written once per frame by MoldScene (the flask owner),
 * read by uniform reference inside the materials' onBeforeCompile patches. Plain objects: no React state.
 */
/** 0..1: the opaque flask and investment dissolve (screen-door) so the X-ray shell shows through. */
export const xrayUniform = { value: 0 }
export const heatUniforms = {
  /** 0..1 furnace heat. */
  uHeat: { value: 0 },
  /** HDR glow color for that heat (heatColor). */
  uHeatColor: { value: new THREE.Color(0, 0, 0) },
}
