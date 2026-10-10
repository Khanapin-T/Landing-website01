import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WIPE } from '../../config/birth'
import { birth } from './state'

const vertexShader = /* glsl */ `
uniform float uX;
void main() {
  // The left edge stays at the screen edge, the right edge follows the wipe line: off = a zero-width quad.
  float x = position.x < 0.0 ? -1.0 : max(uX, -1.0);
  gl_Position = vec4(x, position.y, 0.0, 1.0);
}`

const fragmentShader = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}`

/**
 * The black behind the sweeping wipe line (Act 7 finale): one clip-space quad from the left screen edge to NDC
 * x = birth.wipeX, pure black, drawn first in the opaque pass (lowest renderOrder, no depth test or write), so the ring
 * and its reflection draw over it. Zero width (no fragments) until the sweep starts. Always visible with the act, so
 * the loader compiles it.
 */
export function Curtain() {
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uX: { value: -2 } },
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    material.uniforms.uX.value = birth.wipeX > WIPE.leftX ? birth.wipeX : -2
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-1000} />
}
