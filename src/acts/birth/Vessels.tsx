import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { JAR_FLOOR_Y, jarOffsetY } from '../../config/birth'
import { VESSELS, VESSEL_GLASS, vesselContentProfile, vesselGlassProfile } from '../../config/birthTable'
import { getAppState } from '../../story/appState'
import { birth } from './state'
import { createGlassMaterial } from './jarMaterial'

const lathe = (profile: [number, number][]) => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), VESSEL_GLASS.segments)

/**
 * The other glass vessels on the table around the acid jar (Act 7, decor): lathe glass shells with muted, desaturated
 * contents so the acid jar stays the accent. They stand at JAR_FLOOR_Y, ride with the jar and are visible only while it
 * is (and during the loader, so the materials compile). Transparent, drawn before the acid jar (renderOrder 8 and 9,
 * the acid is 10 and the jar glass 11), so the acid jar draws correctly in front of the ones behind it.
 */
export function Vessels() {
  const parts = useMemo(
    () =>
      VESSELS.map((v) => {
        const content = vesselContentProfile(v)
        return {
          spec: v,
          glass: lathe(vesselGlassProfile(v)),
          liquid: content ? lathe(content) : null,
          liquidMat: v.content
            ? new THREE.MeshStandardMaterial({
                color: v.content.color,
                roughness: 0.2,
                metalness: 0,
                envMapIntensity: 0.4,
                transparent: true,
                opacity: v.content.opacity,
                depthWrite: false,
              })
            : null,
        }
      }),
    [],
  )
  const glassMat = useMemo(
    () => createGlassMaterial({ color: VESSEL_GLASS.color, opacity: VESSEL_GLASS.opacity, envMapIntensity: VESSEL_GLASS.envMapIntensity, rim: VESSEL_GLASS.rim }),
    [],
  )
  useEffect(
    () => () => {
      for (const p of parts) {
        p.glass.dispose()
        p.liquid?.dispose()
        p.liquidMat?.dispose()
      }
      glassMat.dispose()
    },
    [parts, glassMat],
  )

  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    g.position.y = jarOffsetY(birth.jar, birth.jarAway)
    g.visible = getAppState().phase === 'loading' || (birth.jar > 0.001 && birth.jarAway < 0.999)
  })

  return (
    <group ref={group}>
      {parts.map((p) => (
        <group key={p.spec.id} position={[p.spec.x, JAR_FLOOR_Y, p.spec.z]}>
          {p.liquid && p.liquidMat && <mesh geometry={p.liquid} material={p.liquidMat} renderOrder={8} />}
          <mesh geometry={p.glass} material={glassMat} renderOrder={9} />
        </group>
      ))}
    </group>
  )
}
