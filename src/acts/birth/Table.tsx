import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { jarOffsetY } from '../../config/birth'
import { JAR_AXIS, TABLE, TABLE_GLOW } from '../../config/birthTable'
import { getAppState } from '../../story/appState'
import { birth } from './state'

/** A white radial falloff (1 at the centre, 0 at the edge) as a tiny data texture: the glow quad's map. */
function createGlowTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const d = Math.min(1, Math.hypot((i + 0.5) / size - 0.5, (j + 0.5) / size - 0.5) * 2)
      const v = Math.round(255 * Math.pow(1 - d, 2.2))
      data.set([v, v, v, 255], (j * size + i) * 4)
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

/**
 * The table the acid jar stands on (Act 7): a dark satin slab, much wider than the frame, its top at the jar floor,
 * and a faint green spill of the acid on it (an additive radial glow quad). Rides with the jar (rises in, goes away)
 * and is visible only while it is (and during the loader, so the materials compile).
 */
export function Table() {
  const slab = useMemo(() => {
    const depth = TABLE.frontZ - TABLE.backZ
    return new THREE.BoxGeometry(2 * TABLE.halfX, TABLE.thickness, depth).translate(
      0,
      TABLE.topY - TABLE.thickness / 2,
      (TABLE.frontZ + TABLE.backZ) / 2,
    )
  }, [])
  const glow = useMemo(() => new THREE.PlaneGeometry(2 * TABLE_GLOW.radius, 2 * TABLE_GLOW.radius).rotateX(-Math.PI / 2), [])
  const slabMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: TABLE.color,
        roughness: TABLE.roughness,
        metalness: TABLE.metalness,
        envMapIntensity: TABLE.envMapIntensity,
      }),
    [],
  )
  const glowTex = useMemo(() => createGlowTexture(), [])
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glowTex,
        color: new THREE.Color(TABLE_GLOW.color).multiplyScalar(TABLE_GLOW.intensity),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [glowTex],
  )
  useEffect(
    () => () => {
      slab.dispose()
      glow.dispose()
      slabMat.dispose()
      glowMat.dispose()
      glowTex.dispose()
    },
    [slab, glow, slabMat, glowMat, glowTex],
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
      <mesh geometry={slab} material={slabMat} />
      {/* Under the glass (renderOrder 8..11), above the opaque table. */}
      <mesh geometry={glow} material={glowMat} position={[JAR_AXIS.x, TABLE.topY + TABLE_GLOW.lift,JAR_AXIS.z]} renderOrder={7} />
    </group>
  )
}
