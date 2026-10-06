import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { createXrayMaterial } from '../../scene/furnace/xrayMaterial'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { createLatheGeometry, createShellGeometry } from './flaskGeometry'
import { FLASK_RADIUS, SHELL, flangeProfile, footProfile, rimProfile } from './flaskMaterial'

/** Flask-local origin (middle of the flask) of the tube shell, like Flask.tsx. */
const MIDDLE_Y = MOLD.flask.bottomY + MOLD.flask.height / 2
const X_RAY_COLOR = new THREE.Color(0.35, 1.0, 1.35)

/**
 * The flask in X-ray: a cyan fresnel shell of the tube, flange, foot and rim, in the flask frame (mounted inside the
 * flask rig, so it flips with the flask). Its alpha is story.flask.xray; the opaque steel dissolves under it.
 */
export function FlaskXray() {
  const { material, uniforms } = useMemo(() => createXrayMaterial(X_RAY_COLOR, { power: 2, base: 0.05 }), [])
  const geometries = useMemo(
    () => ({
      tube: createShellGeometry(FLASK_RADIUS, SHELL),
      flange: createLatheGeometry(flangeProfile()),
      foot: createLatheGeometry(footProfile()),
      rim: createLatheGeometry(rimProfile()),
    }),
    [],
  )
  useEffect(() => () => Object.values(geometries).forEach((g) => g.dispose()), [geometries])
  useEffect(() => () => material.dispose(), [material])

  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    uniforms.uAlpha.value = story.flask.xray
    if (group.current) group.current.visible = getAppState().phase === 'loading' || story.flask.xray > 0.001
  })

  return (
    <group ref={group}>
      <mesh geometry={geometries.tube} material={material} position={[0, MIDDLE_Y, 0]} />
      <mesh geometry={geometries.flange} material={material} />
      <mesh geometry={geometries.foot} material={material} />
      <mesh geometry={geometries.rim} material={material} />
    </group>
  )
}
