import * as THREE from 'three'

/** Session 00 placeholder: polished yellow gold. Later sessions extend this into the multi-state ring material. */
export function createRingMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e3b04b'),
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: 1.1,
  })
}
