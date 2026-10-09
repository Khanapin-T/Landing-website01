import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PRINT, railOpacity, railSpan } from '../../config/print'
import { getAppState } from '../../story/appState'
import { print } from './state'

const { width, depth, thickness, parkedY } = PRINT.plate
const RAILS = PRINT.rails

/**
 * The plate mount, kept minimal after the author's reference printer photos: one solid block on two flat legs with a
 * gap over the plate, a stepped top with a small clamp lever, and an arm (hidden behind the block) back to the rails.
 * Plate-relative heights (the group origin is the plate's bottom face).
 */
const BLOCK = { w: 0.8, h: 0.34, d: 0.56, gap: 0.16 }
const BLOCK_Y = thickness + BLOCK.gap + BLOCK.h / 2
const BLOCK_TOP = thickness + BLOCK.gap + BLOCK.h
const STEP = { w: 0.58, h: 0.09, d: 0.4 }
const LEVER = { w: 0.24, h: 0.05, d: 0.18 }
const LEG = { w: 0.05, d: 0.42 }
const ARM = { w: 2 * RAILS.x + RAILS.width, h: 0.18 }
const ARM_FROM = RAILS.z
const ARM_TO = -BLOCK.d / 2

/**
 * Build plate: a wide aluminium plate under the mount; the arm ties the mount to two black rails fixed in the world.
 * The rails only show above the plate (never behind the print) and fade in as the plate comes into the frame.
 */
export function BuildPlate() {
  const group = useRef<THREE.Group>(null)
  const rails = useRef<THREE.Group>(null)

  const plate = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#8c96a1', metalness: 1, roughness: 0.3, envMapIntensity: 0.75 }),
    [],
  )
  // Matte bead-blasted aluminium, like the photos.
  const alu = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c4cad1', metalness: 0.85, roughness: 0.55, envMapIntensity: 0.8 }),
    [],
  )
  // Transparent from the start (only the opacity changes), so fading never recompiles the program.
  const black = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0f1216', metalness: 0.4, roughness: 0.55, envMapIntensity: 0.5, transparent: true }),
    [],
  )
  // Unit box from y = 0 to 1, scaled each frame from the plate top up to the rails' top.
  const rail = useMemo(() => new THREE.BoxGeometry(RAILS.width, 1, RAILS.depth).translate(0, 0.5, 0), [])
  useEffect(
    () => () => {
      plate.dispose()
      alu.dispose()
      black.dispose()
      rail.dispose()
    },
    [plate, alu, black, rail],
  )

  useFrame(() => {
    const loading = getAppState().phase === 'loading'
    const g = group.current
    if (g) {
      g.visible = loading || print.plate < parkedY - 0.001
      g.position.y = print.plate
    }
    const opacity = railOpacity(print.plate)
    const span = railSpan(print.plate)
    black.opacity = loading ? 1 : opacity
    const r = rails.current
    if (r) {
      r.visible = loading || (opacity > 0.001 && span.height > 0)
      r.position.y = span.bottom
      r.scale.y = Math.max(span.height, 0.001)
    }
  })

  return (
    <>
      {/* Starts visible: Precompile (traverseVisible) runs before the first frame sets the real value. */}
      <group ref={group}>
        <RoundedBox args={[width, thickness, depth]} radius={0.018} smoothness={4} position={[0, thickness / 2, 0]} material={plate} />
        {[-1, 1].map((sx) => (
          <mesh key={sx} material={alu} position={[sx * (BLOCK.w / 2 - LEG.w / 2 - 0.04), thickness + BLOCK.gap / 2 + 0.01, 0]}>
            <boxGeometry args={[LEG.w, BLOCK.gap + 0.02, LEG.d]} />
          </mesh>
        ))}
        <RoundedBox args={[BLOCK.w, BLOCK.h, BLOCK.d]} radius={0.02} smoothness={3} position={[0, BLOCK_Y, 0]} material={alu} />
        <RoundedBox args={[STEP.w, STEP.h, STEP.d]} radius={0.02} smoothness={3} position={[0, BLOCK_TOP + STEP.h / 2, -0.03]} material={alu} />
        <RoundedBox
          args={[LEVER.w, LEVER.h, LEVER.d]}
          radius={0.012}
          smoothness={2}
          position={[0, BLOCK_TOP + STEP.h + LEVER.h / 2, 0.02]}
          rotation-x={-0.15}
          material={alu}
        />
        {/* Arm straight back into the rails, hidden behind the block from the front. */}
        <mesh material={alu} position={[0, BLOCK_Y, (ARM_FROM + ARM_TO) / 2]}>
          <boxGeometry args={[ARM.w, ARM.h, ARM_TO - ARM_FROM]} />
        </mesh>
      </group>

      {/* The two black rails, fixed in the world, from the plate top up. */}
      <group ref={rails}>
        {[-1, 1].map((sx) => (
          <mesh key={sx} geometry={rail} material={black} position={[sx * RAILS.x, 0, RAILS.z]} />
        ))}
      </group>
    </>
  )
}
