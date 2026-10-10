import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAM_BIRTH, LINE, LINE_DIR, POLISH, WIPE, polishLinePoint } from '../../config/birth'
import { getAppState } from '../../story/appState'
import { NEON } from './PolishLine'
import { birth } from './state'
import { applyWipeClips, wipeView } from './useWipeClip'
import { screenLineFromEnds, wipeLineAt, wipePhase, type ScreenLine } from './wipe'

/** Thickness of the 3D polish line on screen in the polish view (half-viewport-heights; Stage camera fov 30). */
const LINE_WIDTH_S = LINE.width / ((CAM_BIRTH.polish.z - POLISH.z - LINE.zFront) * Math.tan((15 * Math.PI) / 180))

const vertexShader = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform vec2 uCenter;
uniform vec2 uDir;
uniform float uHalf;
uniform float uWidth;
uniform float uAspect;
uniform float uPx;
uniform float uGlow;
varying vec2 vNdc;
void main() {
  vec2 p = vec2(vNdc.x * uAspect, vNdc.y) - uCenter;
  float along = abs(dot(p, uDir)) - uHalf;
  float across = abs(dot(p, vec2(-uDir.y, uDir.x))) - 0.5 * uWidth;
  // Distance outside the core rectangle (0 inside), in half-viewport-heights.
  float d = length(max(vec2(along, across), 0.0));
  float core = 1.0 - smoothstep(0.0, uPx, d);
  float glow = uGlow * exp(-d / (2.5 * uWidth));
  gl_FragColor = vec4(uColor * (core + glow), 1.0);
}`

/**
 * The page-wide wipe line (Act 7 finale), drawn in screen space by one fullscreen clip-space quad (additive, no depth,
 * drawn last). Each frame it projects the 3D polish line with the camera and carries it to the left page edge
 * (birth.edge, config/birth.ts WIPE), then sweeps it across (birth.wipeX). It takes over from the 3D PolishLine when
 * birth.edge > 0 at exactly the projected place and thickness. It also publishes the screen line (wipeView) and
 * writes the DOM clips (useWipeClip) in the same frame, so the copy is erased exactly at the drawn line.
 * Must stay mounted before PolishLine: the label reads wipeView in its own useFrame.
 */
export function WipeLine() {
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uColor: { value: NEON.clone() },
          uCenter: { value: new THREE.Vector2() },
          uDir: { value: new THREE.Vector2(0, 1) },
          uHalf: { value: 0 },
          uWidth: { value: LINE_WIDTH_S },
          uAspect: { value: 1 },
          uPx: { value: 0.002 },
          uGlow: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
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

  const mesh = useRef<THREE.Mesh>(null)
  const tmp = useMemo(() => ({ c: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3() }), [])
  const start = useMemo<ScreenLine>(() => ({ x: 0, y: 0, angle: 0, half: 0 }), [])

  useFrame((state) => {
    const cam = state.camera
    cam.updateMatrixWorld()
    const { width, height } = state.size
    const aspect = width / height

    // The 3D line where it is now (at the end of its pass during the edge move), projected.
    polishLinePoint(birth.line, tmp.c)
    tmp.a.copy(tmp.c).addScaledVector(LINE_DIR, -LINE.length / 2).project(cam)
    tmp.b.copy(tmp.c).addScaledVector(LINE_DIR, LINE.length / 2).project(cam)
    screenLineFromEnds(tmp.a.x, tmp.a.y, tmp.b.x, tmp.b.y, aspect, start)

    const v = wipeView
    v.phase = wipePhase(birth.line, birth.wipeX)
    wipeLineAt(start, birth.edge, birth.wipeX, aspect, v.line)
    v.aspect = aspect
    v.width = width
    v.height = height
    v.wipeX = birth.wipeX
    applyWipeClips()

    const u = material.uniforms
    u.uCenter.value.set(v.line.x, v.line.y)
    u.uDir.value.set(Math.cos(v.line.angle), Math.sin(v.line.angle))
    u.uHalf.value = v.line.half
    const k = v.phase === 'sweep' || v.phase === 'done' ? 1 : Math.min(Math.max(birth.edge, 0), 1)
    u.uWidth.value = LINE_WIDTH_S + (WIPE.width - LINE_WIDTH_S) * k
    u.uGlow.value = WIPE.glow * k * k * (3 - 2 * k)
    u.uAspect.value = aspect
    u.uPx.value = 2 / height

    if (mesh.current) mesh.current.visible = getAppState().phase === 'loading' || (birth.edge > 0 && v.phase !== 'done')
  })

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={40} />
}
