import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { COILS } from '../../config/fire'
import { CAM } from '../../config/mold'
import { heatColor } from '../../scene/furnace/heat'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { coilLayout } from './coilLayout'
import { createHelixGeometry } from './helix'
import { fire } from './state'

/** Must equal the Stage camera fov. */
const FOV = 30
const COLD_STEEL = '#3b424b'
const COLD = new THREE.Color(COLD_STEEL)
/** How much of its cold steel color and reflections a coil keeps at full heat (the glow must not wash out to cream). */
const HOT_KEEP = 0.2
const glow: [number, number, number] = [0, 0, 0]

/**
 * The 12 heating coils of Act 4: a tunnel of three rows (see coilLayout). One material per row (alpha hash fades the
 * row in through fire.coils[row], opaque pipeline, no sorting); the emissive glow follows story.flask.heat. All rows
 * share one program. Rebuilt on resize because the walls follow the viewport.
 */
export function Coils() {
  const size = useThree((s) => s.size)
  const layout = useMemo(
    () => coilLayout({ aspect: size.width / size.height, fovDeg: FOV, camZ: CAM.tree.z }),
    [size.width, size.height],
  )
  const side = useMemo(() => createHelixGeometry(layout.sideLength, 'x'), [layout.sideLength])
  const span = useMemo(() => createHelixGeometry(layout.horizontalLength, 'x'), [layout.horizontalLength])
  const rows = useMemo(
    () =>
      COILS.rowZ.map(
        () =>
          new THREE.MeshStandardMaterial({
            color: COLD_STEEL,
            metalness: 0.85,
            roughness: 0.4,
            envMapIntensity: 1.2,
            emissive: new THREE.Color(0, 0, 0),
            alphaHash: true,
          }),
      ),
    [],
  )
  useEffect(() => () => side.dispose(), [side])
  useEffect(() => () => span.dispose(), [span])
  useEffect(() => () => rows.forEach((m) => m.dispose()), [rows])

  const meshes = useRef<(THREE.Mesh | null)[]>([])

  useFrame(() => {
    const loading = getAppState().phase === 'loading'
    heatColor(story.flask.heat, glow)
    for (let row = 0; row < rows.length; row++) {
      rows[row].opacity = fire.coils[row]
      rows[row].emissive.setRGB(glow[0], glow[1], glow[2])
      const keep = 1 - (1 - HOT_KEEP) * Math.min(Math.max(story.flask.heat, 0), 1)
      rows[row].color.copy(COLD).multiplyScalar(keep)
      rows[row].envMapIntensity = 1.2 * keep
    }
    for (let i = 0; i < layout.coils.length; i++) {
      const m = meshes.current[i]
      if (m) m.visible = loading || fire.coils[layout.coils[i].row] > 0.001
    }
  })

  // Everything starts visible: Precompile (traverseVisible) runs before the first frame sets the real values.
  return (
    <group>
      {layout.coils.map((c, i) => (
        <mesh
          key={`${c.row}-${c.side}`}
          ref={(m) => {
            meshes.current[i] = m
          }}
          geometry={c.side === 'left' || c.side === 'right' ? side : span}
          material={rows[c.row]}
          position={c.center}
        />
      ))}
    </group>
  )
}
