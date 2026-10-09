import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PRINT } from '../../config/print'
import { getAppState } from '../../story/appState'
import { print } from './state'

const { pool, cureY } = PRINT
/** The light is a little larger than the bed of points so its edge falls off softly around them. */
const W = pool.halfWidth * 2 * 1.12
const D = pool.halfDepth * 2 * 1.18

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Soft rectangular falloff (the bed has the plate's footprint): the cure light seen through the resin from below.
const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying vec2 vUv;
void main() {
  vec2 q = abs((vUv - 0.5) * 2.0);
  float edge = max(q.x, q.y);
  float a = (1.0 - smoothstep(0.7, 1.0, edge)) * uStrength;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`

/** Cure light under the resin bed: on softly while the points pool, brighter while printing. */
export function CureBed() {
  const plane = useMemo(() => new THREE.PlaneGeometry(W, D), [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uColor: { value: new THREE.Color('#7fe0a6') }, uStrength: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        premultipliedAlpha: true,
      }),
    [],
  )
  useEffect(() => () => plane.dispose(), [plane])
  useEffect(() => () => material.dispose(), [material])

  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    material.uniforms.uStrength.value = 0.18 * print.bed + 0.22 * print.glow
    if (ref.current) ref.current.visible = getAppState().phase === 'loading' || print.bed > 0.001
  })

  // Starts visible: Precompile (traverseVisible) runs before the first frame sets the real value.
  return <mesh ref={ref} geometry={plane} material={material} position={[0, cureY - 0.03, 0]} rotation-x={-Math.PI / 2} />
}
