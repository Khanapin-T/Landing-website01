import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FOCUS_X } from '../../scene/cameraMath'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { FIRE_BEATS } from './beats'

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0); // clip space, on the far plane
}
`

// Opaque and first in the queue: paints the background color plus a slow molten glow around the flask axis.
const fragmentShader = /* glsl */ `
uniform vec3 uBase;
uniform float uHeat;
uniform float uTime;
uniform vec2 uCenter;
uniform float uAspect;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
  float glow = 1.0 - smoothstep(0.0, 1.4, length(d));
  glow *= glow;
  float flow = fbm(d * 2.2 + vec2(0.0, -uTime * 0.12));
  vec3 deep = vec3(0.30, 0.03, 0.01);
  vec3 hot = vec3(0.95, 0.30, 0.05);
  vec3 col = mix(deep, hot, smoothstep(0.35, 0.9, flow * glow * 1.6 + glow * 0.25));
  float heat = uHeat * uHeat;
  gl_FragColor = vec4(uBase + col * glow * (0.55 + 0.9 * flow) * heat * 0.9, 1.0);
}
`

const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Full-screen molten glow behind the scene (a clip-space triangle, no camera involved). Strength follows
 * story.flask.heat; it stays after Act 4 until a later act cools the heat down. Color = the Stage background, so at
 * heat 0 it is invisible.
 */
export function HeatBackdrop() {
  const size = useThree((s) => s.size)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uBase: { value: new THREE.Color('#0a1622') },
          uHeat: { value: 0 },
          uTime: { value: 0 },
          uCenter: { value: new THREE.Vector2(FOCUS_X, 0.5) },
          uAspect: { value: 1.78 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const u = material.uniforms
    u.uHeat.value = story.flask.heat
    u.uTime.value = clock.elapsedTime * (REDUCE ? 0.15 : 1)
    u.uAspect.value = size.width / size.height
    if (ref.current) {
      ref.current.visible = getAppState().phase === 'loading' || (story.screen >= FIRE_BEATS.windowFrom && story.flask.heat > 0.001)
    }
  })

  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={-100} />
}
