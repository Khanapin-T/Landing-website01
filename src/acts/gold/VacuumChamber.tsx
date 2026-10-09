import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CHAMBER, HOSE, chamberProfile, hosePath, washerProfile } from '../../config/gold'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { gold } from './state'

/** Dark iron and black rubber. Plain first shapes; texture and details come after the author's corrections. */
const IRON = '#2b2e33'
const RUBBER = '#141517'
/** The sealing washer under the flask's flange: pale silicone like in the author's photo, so it reads against the iron. */
const WASHER_COLOR = '#d8d5cc'

/**
 * The vacuum chamber of Act 5: a dark iron cup as wide as the flask's flange, a 5 mm rubber washer on its rim under the
 * flange (no metal to metal), and a rubber hose on its side that pumps the air out. All slide up from below the frame (gold.chamber) and fade out with alpha hash while X-ray is
 * on (opaque pipeline, no sorting), so the pour stays visible; they come back with the steel when X-ray ends.
 */
export function VacuumChamber() {
  const cup = useMemo(() => new THREE.LatheGeometry(chamberProfile().map(([x, y]) => new THREE.Vector2(x, y)), 64), [])
  const washer = useMemo(() => new THREE.LatheGeometry(washerProfile().map(([x, y]) => new THREE.Vector2(x, y)), 64), [])
  const hose = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(hosePath().map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    return new THREE.TubeGeometry(curve, 48, HOSE.radius, 12, false)
  }, [])
  const iron = useMemo(
    () => new THREE.MeshStandardMaterial({ color: IRON, metalness: 0.75, roughness: 0.55, envMapIntensity: 0.8, alphaHash: true, side: THREE.DoubleSide }),
    [],
  )
  const rubber = useMemo(() => new THREE.MeshStandardMaterial({ color: RUBBER, metalness: 0, roughness: 0.8, alphaHash: true }), [])
  const silicone = useMemo(
    () => new THREE.MeshStandardMaterial({ color: WASHER_COLOR, metalness: 0, roughness: 0.7, alphaHash: true, side: THREE.DoubleSide }),
    [],
  )
  useEffect(() => () => cup.dispose(), [cup])
  useEffect(() => () => washer.dispose(), [washer])
  useEffect(() => () => silicone.dispose(), [silicone])
  useEffect(() => () => hose.dispose(), [hose])
  useEffect(() => () => iron.dispose(), [iron])
  useEffect(() => () => rubber.dispose(), [rubber])

  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const seen = 1 - story.flask.xray
    iron.opacity = seen
    rubber.opacity = seen
    silicone.opacity = seen
    const g = ref.current
    if (!g) return
    g.position.y = (1 - gold.chamber) * CHAMBER.dropOffset
    // Visible while loading so Precompile compiles both materials.
    g.visible = getAppState().phase === 'loading' || (gold.chamber > 0.001 && seen > 0.001)
  })

  return (
    <group ref={ref}>
      <mesh geometry={cup} material={iron} />
      <mesh geometry={washer} material={silicone} />
      <mesh geometry={hose} material={rubber} />
    </group>
  )
}
