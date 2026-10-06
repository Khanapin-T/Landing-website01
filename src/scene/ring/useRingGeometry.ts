import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { computeNormalization, type Vec3 } from './normalize'

export const RING_URL = '/models/ring.glb'
export const RING_LIGHT_URL = '/models/ring_light.glb'
/** Ring height in world units. */
export const RING_HEIGHT = 1

const cache = new WeakMap<object, THREE.BufferGeometry>()

function normalizedGeometry(scene: THREE.Object3D): THREE.BufferGeometry {
  scene.updateMatrixWorld(true)
  let mesh: THREE.Mesh | undefined
  scene.traverse((o) => {
    if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
  })
  if (!mesh) throw new Error('ring model contains no mesh')
  const g = mesh.geometry.clone()
  g.applyMatrix4(mesh.matrixWorld)
  g.computeBoundingBox()
  const b = g.boundingBox!
  const n = computeNormalization({ min: b.min.toArray() as Vec3, max: b.max.toArray() as Vec3 }, RING_HEIGHT)
  g.translate(...n.offset)
  g.scale(n.scale, n.scale, n.scale)
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}

function useNormalizedGeometry(url: string): THREE.BufferGeometry {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    let g = cache.get(scene)
    if (!g) {
      g = normalizedGeometry(scene)
      cache.set(scene, g)
    }
    return g
  }, [scene])
}

/**
 * The hero ring geometry, auto-normalized (replacement contract: centered, height RING_HEIGHT, Y up).
 * One shared instance: HeroRing, Act 1 edges and particle sampling all read the same buffer.
 */
export function useRingGeometry(): THREE.BufferGeometry {
  return useNormalizedGeometry(RING_URL)
}

/** The light (40k tris) ring for the tree clones, normalized the same way as the hero ring. */
export function useRingLightGeometry(): THREE.BufferGeometry {
  return useNormalizedGeometry(RING_LIGHT_URL)
}

useGLTF.preload(RING_URL)
useGLTF.preload(RING_LIGHT_URL)
