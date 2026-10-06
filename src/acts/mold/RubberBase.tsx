import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { getAppState } from '../../story/appState'
import { baseProfile } from './flaskMaterial'
import { mold } from './state'

const { dropOffset } = MOLD.base
/** Matte black rubber. */
const RUBBER = { color: '#15181c', roughness: 0.85 } as const

/**
 * Black rubber cup around the flask foot (the foot drops into its bore and the flange lands on its top face), with
 * the crucible-former cone in the middle (profile and sizes: baseProfile() and MOLD.base). Rises from below the
 * frame with mold.base and drops away after.
 */
export function RubberBase() {
  const geometry = useMemo(
    () =>
      new THREE.LatheGeometry(
        baseProfile().map(([x, y]) => new THREE.Vector2(x, y)),
        96,
      ),
    [],
  )
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: RUBBER.color, roughness: RUBBER.roughness, metalness: 0 }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const m = ref.current
    if (!m) return
    m.position.y = (1 - mold.base) * dropOffset
    m.visible = getAppState().phase === 'loading' || mold.base > 0.001
  })

  // Starts visible: Precompile (traverseVisible) runs before the first frame sets the real value.
  return <mesh ref={ref} geometry={geometry} material={material} />
}
