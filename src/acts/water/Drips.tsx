import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FLIP } from '../../config/fire'
import { FLASK_TUBE_RADIUS, WATER_Y, flaskOffset } from '../../config/water'
import { mulberry32 } from '../../lib/random'
import { particleDrawCount } from '../../scene/particles/particleData'
import { useQuality } from '../../scene/quality/qualityStore'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { water } from './state'

const COUNT = 360
/** Half length of the lying flask along X (from the pivot to either end, config/water.ts). */
const HALF_LENGTH = 2.4
/** Point size in world units. */
const SIZE = 0.035

const vertexShader = /* glsl */ `
attribute float aStart;
attribute float aSeed;
uniform float uDrip;
uniform float uAxisY;
uniform float uWaterY;
uniform float uTubeR;
uniform float uSize;
uniform float uScale;
varying float vAlpha;
void main() {
  // position.x / position.z: where on the lying flask's underside the drop leaves. t: 0 = hanging, 1 = gone.
  float t = clamp((uDrip - aStart) / 0.22, 0.0, 1.0);
  float under = sqrt(max(uTubeR * uTubeR - position.z * position.z, 0.0));
  vec3 p = vec3(position.x, uAxisY - under, position.z);
  p.y -= 7.0 * t * t;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uScale * projectionMatrix[1][1] / -mv.z * (0.6 + 0.8 * aSeed);
  // Shown while falling, gone once it reaches the water.
  vAlpha = step(0.0001, t) * (1.0 - smoothstep(0.85, 1.0, t)) * step(uWaterY, p.y);
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.2, 0.5, d)) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`

/**
 * Milky drops falling from the flask as it comes out of the white water (Act 6, world space, mount at the scene
 * root): COUNT points spread along the lying flask's underside, each released at its own `aStart` of water.drip and
 * falling back into the water. Follows the flask's current height (story.flask.dip). Scroll-scrubbed only.
 */
export function Drips() {
  const geometry = useMemo(() => {
    const rand = mulberry32(73)
    const position = new Float32Array(COUNT * 3)
    const start = new Float32Array(COUNT)
    const seed = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      position.set([(rand() * 2 - 1) * HALF_LENGTH, 0, (rand() * 2 - 1) * FLASK_TUBE_RADIUS * 0.7], i * 3)
      start[i] = rand() * 0.75
      seed[i] = rand()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(position, 3))
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uDrip: { value: 0 },
          uAxisY: { value: 0 },
          uWaterY: { value: WATER_Y },
          uTubeR: { value: FLASK_TUBE_RADIUS },
          uSize: { value: SIZE },
          uScale: { value: 540 },
          uColor: { value: new THREE.Color('#f1eee6') },
        },
        transparent: true,
        depthWrite: false,
        premultipliedAlpha: true,
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

  const { particleScale } = useQuality()
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    geometry.setDrawRange(0, particleDrawCount(COUNT, particleScale, reduce))
  }, [geometry, particleScale])

  const gl = useThree((s) => s.gl)
  const ref = useRef<THREE.Points>(null)
  useFrame(() => {
    const u = material.uniforms
    u.uDrip.value = water.drip
    u.uAxisY.value = FLIP.pivotY + flaskOffset(story.flask).y
    u.uScale.value = (gl.domElement.height || 1080) / 2
    if (ref.current) ref.current.visible = getAppState().phase === 'loading' || (water.drip > 0.001 && water.drip < 0.999)
  })

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}
