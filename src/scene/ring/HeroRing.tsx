import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { computeNormalization, type Vec3 } from './normalize'
import { createRingMaterial } from './ringMaterial'
import { story } from '../../story/store'

export const RING_URL = '/models/ring.glb'
/** Ring height in world units. */
export const RING_HEIGHT = 1

/** The one persistent hero ring. Auto-normalizes any re-exported ring.glb (replacement contract). */
export function HeroRing() {
  const { scene } = useGLTF(RING_URL)

  const geometry = useMemo(() => {
    scene.updateMatrixWorld(true)
    let mesh: THREE.Mesh | undefined
    scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
    })
    if (!mesh) throw new Error('ring.glb contains no mesh')
    const g = mesh.geometry.clone()
    g.applyMatrix4(mesh.matrixWorld)
    g.computeBoundingBox()
    const b = g.boundingBox!
    const n = computeNormalization({ min: b.min.toArray() as Vec3, max: b.max.toArray() as Vec3 }, RING_HEIGHT)
    g.translate(...n.offset)
    g.scale(n.scale, n.scale, n.scale)
    g.computeBoundingSphere()
    return g
  }, [scene])

  const material = useMemo(() => createRingMaterial(), [])

  const ref = useRef<THREE.Mesh>(null)
  // Placeholder motion until act sessions drive the ring: a slow turn around Y tied to scroll.
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = story.screen * Math.PI * 0.35
  })

  return <mesh ref={ref} geometry={geometry} material={material} />
}

useGLTF.preload(RING_URL)
