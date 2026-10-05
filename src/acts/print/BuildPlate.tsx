import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PRINT } from '../../config/print'
import { print } from './state'
import { getAppState } from '../../story/appState'

const { width, depth, thickness, parkedY } = PRINT.plate
const ARM = { w: 0.12, h: 2.0, d: 0.12 }

/** Aluminum build plate with a vertical arm (out of frame above). The group origin is the plate's bottom face. */
export function BuildPlate() {
  const group = useRef<THREE.Group>(null)

  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const aluminum = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c3c9d1', metalness: 1, roughness: 0.38 }),
    [],
  )

  useEffect(() => () => box.dispose(), [box])
  useEffect(() => () => aluminum.dispose(), [aluminum])

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = getAppState().phase === 'loading' || print.plate < parkedY - 0.001
    g.position.y = print.plate
  })

  return (
    // Starts visible: Precompile (traverseVisible) runs before the first frame sets the real value.
    <group ref={group}>
      <mesh geometry={box} material={aluminum} position={[0, thickness / 2, 0]} scale={[width, thickness, depth]} />
      {/* arm on the back edge, rising from the plate top */}
      <mesh
        geometry={box}
        material={aluminum}
        position={[0, thickness + ARM.h / 2, -depth / 2 + ARM.d / 2]}
        scale={[ARM.w, ARM.h, ARM.d]}
      />
    </group>
  )
}
