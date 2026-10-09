import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { bucketOffset, bucketProfile } from '../../config/water'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { water } from './state'

/**
 * The blue plastic bucket (Act 6): an opaque lathe shell (outer wall, rolled lip, inner wall, floor), rising in from
 * below and receding with the flask (config/water.ts bucketOffset). Children (the water surface, the steam) ride
 * along in the same group. A plain first version for the author to correct (no handle, no texture).
 */
export function Bucket({ children }: { children?: ReactNode }) {
  const geometry = useMemo(() => new THREE.LatheGeometry(bucketProfile().map(([x, y]) => new THREE.Vector2(x, y)), 96), [])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a63ad', roughness: 0.55, metalness: 0, envMapIntensity: 0.8, side: THREE.DoubleSide }),
    [],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    const o = bucketOffset(water.bucket, story.flask.away)
    g.position.set(0, o.y, o.z)
    g.visible = getAppState().phase === 'loading' || (water.bucket > 0.001 && story.flask.away < 0.999)
  })

  return (
    <group ref={group}>
      <mesh geometry={geometry} material={material} />
      {children}
    </group>
  )
}
