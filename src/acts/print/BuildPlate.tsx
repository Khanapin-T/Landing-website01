import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PRINT } from '../../config/print'
import { getAppState } from '../../story/appState'
import { print } from './state'

const { width, depth, thickness, parkedY } = PRINT.plate
/** Mounting block on top of the plate and the slim shaft it hangs from (out of frame above). */
const HUB = { w: 0.2, h: 0.05, d: 0.16 }
const SHAFT = { r: 0.022, h: 2.2 }

/** Build plate: a rounded anodized-aluminum plate on a central mount. The group origin is the plate's bottom face. */
export function BuildPlate() {
  const group = useRef<THREE.Group>(null)

  const plate = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#77818d', metalness: 1, roughness: 0.32, envMapIntensity: 0.7 }),
    [],
  )
  const dark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b323c', metalness: 0.8, roughness: 0.4, envMapIntensity: 0.6 }),
    [],
  )
  const shaft = useMemo(() => new THREE.CylinderGeometry(SHAFT.r, SHAFT.r, SHAFT.h, 20), [])
  useEffect(() => () => plate.dispose(), [plate])
  useEffect(() => () => dark.dispose(), [dark])
  useEffect(() => () => shaft.dispose(), [shaft])

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = getAppState().phase === 'loading' || print.plate < parkedY - 0.001
    g.position.y = print.plate
  })

  return (
    // Starts visible: Precompile (traverseVisible) runs before the first frame sets the real value.
    <group ref={group}>
      <RoundedBox args={[width, thickness, depth]} radius={0.018} smoothness={4} position={[0, thickness / 2, 0]} material={plate} />
      <RoundedBox args={[HUB.w, HUB.h, HUB.d]} radius={0.012} smoothness={3} position={[0, thickness + HUB.h / 2, 0]} material={dark} />
      <mesh geometry={shaft} material={dark} position={[0, thickness + HUB.h + SHAFT.h / 2, 0]} />
    </group>
  )
}
