import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MOLD, investmentLevelY } from '../../config/mold'
import { mulberry32 } from '../../lib/random'
import { particleDrawCount } from '../../scene/particles/particleData'
import { useQuality } from '../../scene/quality/qualityStore'
import { getAppState } from '../../story/appState'
import { mold } from './state'

/** Maximum bubble count; the draw range steps down with the quality scale. */
const BUBBLES = 220
/** Bubbles stay clear of the flask wall. */
const MAX_RADIUS = MOLD.flask.innerRadius - 0.1
/** Draws after the investment front layer (13) and before the steel front layer (14). */
const RENDER_ORDER = 13.5
const BUBBLE_COLOR = '#e6eef6'
/** Base sprite size in world units (x 0.5..1.5 per bubble, x up to 1.8 when it swells at the surface). */
const BUBBLE_SIZE = 0.05

// Point size: uSize (world units) projected to drawing-buffer px (same projection as ParticleCloud).
// aData = (rise speed in cycles/s, phase 0..1, size 0..1, rank 0..1).
// A bubble's life u runs 0..1 from the flask bottom to the surface; at the surface it swells and pops.
const vertexShader = /* glsl */ `
attribute vec4 aData;
uniform float uTime;
uniform float uBoil;
uniform float uBottomY;
uniform float uLevelY;
uniform float uSize;
uniform float uScale; // half the drawing-buffer height in px
varying float vAlpha;
void main() {
  float u = fract(aData.y + uTime * aData.x);
  float travel = max(uLevelY - uBottomY, 0.0);
  vec3 p = position;
  p.y = uBottomY + u * travel;
  // Sideways wobble, wider as the bubble gets going.
  float w = uTime * (1.3 + aData.z) + aData.y * 40.0;
  p.x += sin(w) * 0.035;
  p.z += cos(w * 0.83 + aData.w * 20.0) * 0.035;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float pop = smoothstep(0.9, 0.985, u);
  float size = (0.5 + aData.z) * (0.7 + 0.3 * u) * (1.0 + 0.8 * pop);
  gl_PointSize = uSize * uScale * projectionMatrix[1][1] / -mv.z * size;
  // Fade in right after spawning, vanish at the pop; only part of the bubbles are alive at low boil.
  float born = smoothstep(0.0, 0.06, u);
  float alive = smoothstep(aData.w, aData.w + 0.12, uBoil);
  float visible = step(0.0001, travel) * step(p.y, uLevelY);
  vAlpha = born * (1.0 - smoothstep(0.985, 1.0, u)) * alive * visible;
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  // A faint body with a brighter rim, like a thin film.
  float body = 0.14 * (1.0 - smoothstep(0.3, 0.5, d));
  float rim = smoothstep(0.3, 0.42, d) * (1.0 - smoothstep(0.42, 0.5, d));
  float a = (body + rim * 0.85) * vAlpha * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`

/**
 * Vacuum beat: bubbles rise through the investment and pop at its surface. Lives in flask-local space (inside the
 * flask rig, outside the spinner). Ambient motion is time-based; the amount of bubbles follows `mold.boil`.
 */
export function Bubbles() {
  const geometry = useMemo(() => {
    const rand = mulberry32(0xb0b11e)
    const position = new Float32Array(BUBBLES * 3)
    const data = new Float32Array(BUBBLES * 4)
    for (let i = 0; i < BUBBLES; i++) {
      // Uniform over the disc: sqrt keeps the density even.
      const r = Math.sqrt(rand()) * MAX_RADIUS
      const a = rand() * Math.PI * 2
      position[i * 3] = Math.cos(a) * r
      position[i * 3 + 1] = 0
      position[i * 3 + 2] = Math.sin(a) * r
      data[i * 4] = 0.07 + rand() * 0.11
      data[i * 4 + 1] = rand()
      data[i * 4 + 2] = rand()
      // Rank in [0, 0.85]: every bubble is alive once boil reaches 1.
      data[i * 4 + 3] = (i / BUBBLES) * 0.85
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(position, 3))
    g.setAttribute('aData', new THREE.BufferAttribute(data, 4))
    return g
  }, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uBoil: { value: 0 },
          uOpacity: { value: 0 },
          uBottomY: { value: MOLD.investment.bottomY },
          uLevelY: { value: MOLD.investment.bottomY },
          uSize: { value: BUBBLE_SIZE },
          uScale: { value: 540 },
          uColor: { value: new THREE.Color(BUBBLE_COLOR) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // The fragment shader outputs premultiplied color (see ParticleCloud).
        premultipliedAlpha: true,
      }),
    [],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  const { particleScale } = useQuality()
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    geometry.setDrawRange(0, particleDrawCount(BUBBLES, particleScale, reduce))
  }, [geometry, particleScale])

  const gl = useThree((s) => s.gl)
  const ref = useRef<THREE.Points>(null)
  useFrame(({ clock }) => {
    const u = material.uniforms
    u.uTime.value = clock.elapsedTime
    u.uBoil.value = mold.boil
    // Full strength once the boil is under way; the per-bubble rank handles the ramp.
    u.uOpacity.value = Math.min(1, mold.boil * 4)
    u.uLevelY.value = investmentLevelY(mold.fill)
    u.uScale.value = (gl.domElement.height || 1080) / 2
    if (ref.current) ref.current.visible = getAppState().phase === 'loading' || mold.boil > 0.001
  })

  // frustumCulled off: the bounding sphere is a flat disc, the bubbles fill the flask volume.
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={RENDER_ORDER} />
}
