import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PRINT, RESIN_COLOR } from '../../config/print'
import { print } from './state'
import { getAppState } from '../../story/appState'

const { width, depth, wall, height } = PRINT.vat
const innerW = width - 2 * wall
const innerD = depth - 2 * wall
const floorBottom = PRINT.cureY - wall
const wallY = floorBottom + height / 2
const resinH = PRINT.resinSurfaceY - PRINT.cureY

/** Open resin tray (floor + 4 walls), the resin fill and the cure light on the floor. Rises in from below the frame. */
export function Vat() {
  const group = useRef<THREE.Group>(null)

  // One unit box, scaled per mesh; one plane for the cure light.
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1a2430', metalness: 0.6, roughness: 0.45 }),
    [],
  )
  const resin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: RESIN_COLOR,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        roughness: 0.15,
        metalness: 0,
        emissive: RESIN_COLOR,
        emissiveIntensity: 0.05,
      }),
    [],
  )
  const cure = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#c9ffd9',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  useEffect(() => () => box.dispose(), [box])
  useEffect(() => () => plane.dispose(), [plane])
  useEffect(() => () => metal.dispose(), [metal])
  useEffect(() => () => resin.dispose(), [resin])
  useEffect(() => () => cure.dispose(), [cure])

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = getAppState().phase === 'loading' || print.vat > 0.001
    g.position.y = (1 - print.vat) * PRINT.vatHiddenOffset
    resin.emissiveIntensity = 0.05 + 0.25 * print.glow
    cure.opacity = 0.35 * print.glow
  })

  return (
    // Starts visible: Precompile (traverseVisible) runs before the first frame sets the real value.
    <group ref={group}>
      {/* floor: its top face is the cure plane */}
      <mesh geometry={box} material={metal} position={[0, PRINT.cureY - wall / 2, 0]} scale={[width, wall, depth]} />
      {/* front and back walls (full width) */}
      <mesh geometry={box} material={metal} position={[0, wallY, depth / 2 - wall / 2]} scale={[width, height, wall]} />
      <mesh geometry={box} material={metal} position={[0, wallY, -depth / 2 + wall / 2]} scale={[width, height, wall]} />
      {/* left and right walls (between the front and back ones) */}
      <mesh geometry={box} material={metal} position={[width / 2 - wall / 2, wallY, 0]} scale={[wall, height, innerD]} />
      <mesh geometry={box} material={metal} position={[-width / 2 + wall / 2, wallY, 0]} scale={[wall, height, innerD]} />
      {/* resin fill: inner floor up to the resin surface */}
      <mesh
        geometry={box}
        material={resin}
        position={[0, PRINT.cureY + resinH / 2, 0]}
        scale={[innerW, resinH, innerD]}
        renderOrder={1}
      />
      {/* cure light on the floor (60% of the inner footprint) */}
      <mesh
        geometry={plane}
        material={cure}
        position={[0, PRINT.cureY + 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[innerW * 0.6, innerD * 0.6, 1]}
        renderOrder={2}
      />
    </group>
  )
}
