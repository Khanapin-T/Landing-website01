import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ACID_Y, JAR, JAR_FLOOR_Y, jarOffsetY, jarProfile } from '../../config/birth'
import { RAW } from '../../config/water'
import { getAppState } from '../../story/appState'
import { birth } from './state'
import { createAcidMaterial, createGlassMaterial } from './jarMaterial'

/**
 * The low glass jar of luminous acid green (Act 7): a lathe glass shell and an acid cylinder filling it up to ACID_Y,
 * centred under the tree. It rises in from below (birth.jar) and goes down out of the frame with the three other
 * rings (birth.jarAway). Both transparent, drawn after the opaque rings inside.
 */
export function Jar() {
  const glass = useMemo(() => new THREE.LatheGeometry(jarProfile().map(([x, y]) => new THREE.Vector2(x, y)), 72), [])
  const acidHeight = ACID_Y - (JAR_FLOOR_Y + JAR.wall)
  const acid = useMemo(() => {
    const r = JAR.radius - JAR.wall - 0.005
    return new THREE.CylinderGeometry(r, r, acidHeight, 72, 1).translate(0, JAR_FLOOR_Y + JAR.wall + acidHeight / 2, 0)
  }, [acidHeight])
  const glassMat = useMemo(createGlassMaterial, [])
  const acidMat = useMemo(createAcidMaterial, [])
  useEffect(
    () => () => {
      glass.dispose()
      acid.dispose()
      glassMat.dispose()
      acidMat.dispose()
    },
    [glass, acid, glassMat, acidMat],
  )

  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    g.position.set(0, jarOffsetY(birth.jar, birth.jarAway), RAW.z)
    g.visible = getAppState().phase === 'loading' || (birth.jar > 0.001 && birth.jarAway < 0.999)
  })

  return (
    <group ref={group}>
      <mesh geometry={acid} material={acidMat} renderOrder={10} />
      <mesh geometry={glass} material={glassMat} renderOrder={11} />
    </group>
  )
}
