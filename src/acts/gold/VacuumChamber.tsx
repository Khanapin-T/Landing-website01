import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CHAMBER, chamberProfile } from '../../config/gold'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { gold } from './state'

/** Dark iron. A plain first shape; texture and details come after the author's corrections. */
const IRON = '#2b2e33'

/**
 * The vacuum chamber of Act 5: a dark iron cup that slides up from below the frame (gold.chamber) until the flask's
 * flange rests on its rim. It fades out with alpha hash while X-ray is on (opaque pipeline, no sorting), so the pour
 * stays visible, and comes back with the steel when X-ray ends.
 */
export function VacuumChamber() {
  const geometry = useMemo(() => new THREE.LatheGeometry(chamberProfile().map(([x, y]) => new THREE.Vector2(x, y)), 64), [])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: IRON, metalness: 0.75, roughness: 0.55, envMapIntensity: 0.8, alphaHash: true, side: THREE.DoubleSide }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const seen = 1 - story.flask.xray
    material.opacity = seen
    const m = ref.current
    if (!m) return
    m.position.y = (1 - gold.chamber) * CHAMBER.dropOffset
    // Visible while loading so Precompile compiles it.
    m.visible = getAppState().phase === 'loading' || (gold.chamber > 0.001 && seen > 0.001)
  })

  return <mesh ref={ref} geometry={geometry} material={material} />
}
