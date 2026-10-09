import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PRINT, railOpacity } from '../../config/print'
import { getAppState } from '../../story/appState'
import { print } from './state'

const { width, depth, thickness, parkedY } = PRINT.plate
const RAILS = PRINT.rails

/**
 * The plate mount, after the author's reference printer photos: an open box (side walls, top plate, front panel over an opening)
 * standing on four short posts with a gap over the plate, a clamp lever on top, an arm going straight back to the
 * carriage plate that rides in the rails. Plate-relative heights (the group origin is the plate's bottom face).
 */
const BOX = { w: 0.8, d: 0.56, wall: 0.045, wallH: 0.36, top: 0.06, gap: 0.17 }
const BOX_BOTTOM = thickness + BOX.gap
const BOX_TOP = BOX_BOTTOM + BOX.wallH
const FRONT_H = BOX.wallH * 0.58
const POST = 0.07
const CARRIAGE = { w: 2 * RAILS.x + 0.22, h: 0.7, d: 0.06 }
const CARRIAGE_Z = RAILS.z + RAILS.depth / 2 + CARRIAGE.d / 2
const ARM = { w: 0.32, h: 0.3, y: BOX_BOTTOM + BOX.wallH * 0.6 }
const ARM_FROM = CARRIAGE_Z + CARRIAGE.d / 2
const ARM_TO = -BOX.d / 2
const RAIL_H = RAILS.topY - RAILS.bottomY

/**
 * Build plate: a wide anodized-aluminum plate under the mount (BOX), which an arm ties to the carriage behind it. The
 * carriage rides in two black vertical rails fixed in the world (they fade in as the plate comes into the frame).
 */
export function BuildPlate() {
  const group = useRef<THREE.Group>(null)
  const rails = useRef<THREE.Group>(null)

  const plate = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#8c96a1', metalness: 1, roughness: 0.3, envMapIntensity: 0.75 }),
    [],
  )
  const silver = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#b3bac3', metalness: 1, roughness: 0.42, envMapIntensity: 0.8 }),
    [],
  )
  const dark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b323c', metalness: 0.8, roughness: 0.4, envMapIntensity: 0.6 }),
    [],
  )
  // Transparent from the start (only the opacity changes), so fading never recompiles the program.
  const black = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0f1216', metalness: 0.4, roughness: 0.55, envMapIntensity: 0.5, transparent: true }),
    [],
  )
  const screw = useMemo(() => new THREE.CylinderGeometry(0.028, 0.028, 0.02, 16).rotateX(Math.PI / 2), [])
  useEffect(
    () => () => {
      plate.dispose()
      silver.dispose()
      dark.dispose()
      black.dispose()
      screw.dispose()
    },
    [plate, silver, dark, black, screw],
  )

  useFrame(() => {
    const loading = getAppState().phase === 'loading'
    const g = group.current
    if (g) {
      g.visible = loading || print.plate < parkedY - 0.001
      g.position.y = print.plate
    }
    const opacity = railOpacity(print.plate)
    black.opacity = loading ? 1 : opacity
    if (rails.current) rails.current.visible = loading || opacity > 0.001
  })

  const postX = BOX.w / 2 - 0.12
  const postZ = BOX.d / 2 - 0.1

  return (
    <>
      {/* Starts visible: Precompile (traverseVisible) runs before the first frame sets the real value. */}
      <group ref={group}>
        <RoundedBox args={[width, thickness, depth]} radius={0.018} smoothness={4} position={[0, thickness / 2, 0]} material={plate} />

        {/* Four posts from the plate up to the box. */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} material={silver} position={[sx * postX, thickness + (BOX.gap + 0.04) / 2, sz * postZ]}>
              <boxGeometry args={[POST, BOX.gap + 0.04, POST]} />
            </mesh>
          )),
        )}

        {/* The open box: side walls, top plate, front panel over an opening, two screws on the front. */}
        {[-1, 1].map((sx) => (
          <RoundedBox
            key={sx}
            args={[BOX.wall, BOX.wallH, BOX.d]}
            radius={0.01}
            smoothness={2}
            position={[sx * (BOX.w / 2 - BOX.wall / 2), BOX_BOTTOM + BOX.wallH / 2, 0]}
            material={silver}
          />
        ))}
        <RoundedBox args={[BOX.w, BOX.top, BOX.d]} radius={0.015} smoothness={3} position={[0, BOX_TOP + BOX.top / 2, 0]} material={silver} />
        <RoundedBox
          args={[BOX.w - 2 * BOX.wall, FRONT_H, BOX.wall]}
          radius={0.008}
          smoothness={2}
          position={[0, BOX_TOP - FRONT_H / 2, BOX.d / 2 - BOX.wall / 2]}
          material={silver}
        />
        {/* Both screws on the right of the front panel, like the photo. */}
        {[0, 1].map((k) => (
          <mesh key={k} geometry={screw} material={dark} position={[BOX.w / 2 - 0.1 - k * 0.12, BOX_TOP - FRONT_H + 0.07, BOX.d / 2 + 0.008]} />
        ))}

        {/* Clamp lever on top, tilted a little toward the front. */}
        <RoundedBox
          args={[BOX.w * 0.5, 0.06, BOX.d * 0.55]}
          radius={0.012}
          smoothness={2}
          position={[0, BOX_TOP + BOX.top + 0.04, 0.02]}
          rotation-x={-0.12}
          material={silver}
        />

        {/* Arm straight back to the carriage, which rides in the rails (three screws, like the photo). */}
        <RoundedBox
          args={[ARM.w, ARM.h, ARM_TO - ARM_FROM]}
          radius={0.015}
          smoothness={2}
          position={[0, ARM.y, (ARM_FROM + ARM_TO) / 2]}
          material={silver}
        />
        <RoundedBox args={[CARRIAGE.w, CARRIAGE.h, CARRIAGE.d]} radius={0.012} smoothness={2} position={[0, ARM.y, CARRIAGE_Z]} material={silver} />
        {[-1, 0, 1].map((k) => (
          <mesh key={k} geometry={screw} material={dark} position={[CARRIAGE.w / 2 - 0.09, ARM.y + k * 0.2, CARRIAGE_Z + CARRIAGE.d / 2 + 0.008]} />
        ))}
      </group>

      {/* The two black rails, fixed in the world. */}
      <group ref={rails}>
        {[-1, 1].map((sx) => (
          <mesh key={sx} material={black} position={[sx * RAILS.x, RAILS.bottomY + RAIL_H / 2, RAILS.z]}>
            <boxGeometry args={[RAILS.width, RAIL_H, RAILS.depth]} />
          </mesh>
        ))}
      </group>
    </>
  )
}
