import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CAM } from '../../config/mold'
import { heatColor } from '../../scene/furnace/heat'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { coilLayout } from './coilLayout'
import { createHairpinGeometry } from './helix'
import { fire } from './state'

/** Must equal the Stage camera fov. */
const FOV = 30
const COLD = new THREE.Color('#3b424b')
/** How much of its cold steel color and reflections a coil keeps at full heat (the glow must not wash out to cream). */
const HOT_KEEP = 0.2
const TIERS = 3
const glow: [number, number, number] = [0, 0, 0]

/**
 * The heating elements of Act 4 (after the muffle furnace photo): only the left and right walls carry them (no
 * ceiling, no floor), three separate hairpin springs per wall stacked with gaps, each two long runs from the front
 * U-turn toward the back wall, so they converge toward the middle. Tier i = the i-th hairpin of each wall (top first);
 * tier i of every wall shares one material, and alpha hash fades it in through fire.coils[i] (opaque pipeline, no
 * sorting). The emissive glow follows story.flask.heat. All hairpins share one geometry and one program. Rebuilt on
 * resize because the walls follow the viewport.
 */
export function Coils() {
  const size = useThree((s) => s.size)
  const layout = useMemo(
    () => coilLayout({ aspect: size.width / size.height, fovDeg: FOV, camZ: CAM.furnace.z }),
    [size.width, size.height],
  )
  const geometry = useMemo(() => createHairpinGeometry(layout.length, layout.hairpinHeight), [layout.length, layout.hairpinHeight])
  const tiers = useMemo(
    () =>
      Array.from(
        { length: TIERS },
        () =>
          new THREE.MeshStandardMaterial({
            color: COLD,
            metalness: 0.85,
            roughness: 0.4,
            envMapIntensity: 1.2,
            emissive: new THREE.Color(0, 0, 0),
            alphaHash: true,
          }),
      ),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => tiers.forEach((m) => m.dispose()), [tiers])

  const meshes = useRef<(THREE.Mesh | null)[]>([])

  useFrame(() => {
    const loading = getAppState().phase === 'loading'
    heatColor(story.flask.heat, glow)
    const keep = 1 - (1 - HOT_KEEP) * Math.min(Math.max(story.flask.heat, 0), 1)
    for (let i = 0; i < TIERS; i++) {
      tiers[i].opacity = fire.coils[i]
      tiers[i].emissive.setRGB(glow[0], glow[1], glow[2])
      tiers[i].color.copy(COLD).multiplyScalar(keep)
      tiers[i].envMapIntensity = 1.2 * keep
    }
    for (let k = 0; k < meshes.current.length; k++) {
      const m = meshes.current[k]
      if (m) m.visible = loading || fire.coils[k % TIERS] > 0.001
    }
  })

  // Everything starts visible: Precompile (traverseVisible) runs before the first frame sets the real values.
  return (
    <group>
      {layout.walls.flatMap((wall, w) =>
        layout.hairpinY.map((y, tier) => (
          <mesh
            key={`${wall.side}-${tier}`}
            ref={(m) => {
              meshes.current[w * TIERS + tier] = m
            }}
            geometry={geometry}
            material={tiers[tier]}
            position={[wall.position[0], wall.position[1] + y, wall.position[2]]}
            rotation={[0, Math.PI / 2, wall.rotationZ, 'ZYX']}
          />
        )),
      )}
    </group>
  )
}
