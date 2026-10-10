import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CUT_ORDER, SPARKS, cutOutDir, cutPoint } from '../../config/birth'
import { getAppState } from '../../story/appState'
import { QUADS_PER_BURST, buildSparks, writeBurst } from './sparkMath'
import { birth, cutOf } from './state'

const BURSTS = CUT_ORDER.length
const QUADS = BURSTS * QUADS_PER_BURST
const VERTS = QUADS * 4

const vertexShader = /* glsl */ `
attribute vec3 aHead;
attribute vec3 aTail;
attribute float aAge;
attribute vec3 aCorner; // x: 0 tail / 1 head, y: side -1 / 1, z: 1 = the flash
uniform vec2 uViewport; // drawing buffer, px
uniform float uWidth;   // half width of a streak head, px
uniform float uFlash;   // flash radius, px
varying vec2 vUv;
varying float vAge;
varying float vKind;
void main() {
  if (aAge < 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // clipped
    return;
  }
  mat4 vp = projectionMatrix * viewMatrix;
  vec4 ch = vp * vec4(aHead, 1.0);
  vec4 ct = vp * vec4(aTail, 1.0);
  vec2 d = ch.xy / ch.w * uViewport * 0.5 - ct.xy / ct.w * uViewport * 0.5;
  float len = length(d);
  vec2 dir = len > 0.001 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  bool flash = aCorner.z > 0.5;
  vec4 c = flash ? ch : mix(ct, ch, aCorner.x);
  // Streaks: thin, tapering to the tail, a pixel longer at both ends; the flash: a square around the cut point.
  float along = flash ? (aCorner.x * 2.0 - 1.0) * uFlash : (aCorner.x * 2.0 - 1.0) * 1.0;
  float side = flash ? aCorner.y * uFlash : aCorner.y * uWidth * (0.3 + 0.7 * aCorner.x);
  vec2 px = dir * along + nrm * side;
  c.xy += px / (uViewport * 0.5) * c.w;
  gl_Position = c;
  vUv = flash ? vec2(aCorner.x * 2.0 - 1.0, aCorner.y) : vec2(aCorner.x, aCorner.y);
  vAge = aAge;
  vKind = aCorner.z;
}
`

// Premultiplied additive output (as BurnoutCloud). Colours are overbright so the bloom turns the core white.
const fragmentShader = /* glsl */ `
varying vec2 vUv;
varying float vAge;
varying float vKind;
void main() {
  vec3 col;
  float a;
  if (vKind > 0.5) {
    float r = length(vUv);
    a = pow(max(1.0 - r, 0.0), 2.2) * pow(clamp(1.0 - vAge, 0.0, 1.0), 2.0);
    col = vec3(5.0, 4.2, 2.8);
  } else {
    float across = clamp(1.0 - abs(vUv.y), 0.0, 1.0);
    a = pow(across, 1.4) * (0.3 + 0.7 * clamp(vUv.x, 0.0, 1.0)) * pow(clamp(1.0 - vAge, 0.0, 1.0), 1.3);
    col = mix(vec3(5.0, 4.0, 2.2), vec3(2.6, 0.9, 0.12), smoothstep(0.05, 0.9, vAge));
  }
  if (a < 0.003) discard;
  gl_FragColor = vec4(col * a, a);
}
`

function buildGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const corner = new Float32Array(VERTS * 3)
  const index = new Uint16Array(QUADS * 6)
  const corners = [
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 1],
  ]
  for (let q = 0; q < QUADS; q++) {
    const flash = q % QUADS_PER_BURST === 0 ? 1 : 0
    for (let k = 0; k < 4; k++) corner.set([corners[k][0], corners[k][1], flash], (q * 4 + k) * 3)
    index.set([0, 1, 2, 2, 1, 3].map((i) => q * 4 + i), q * 6)
  }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(VERTS * 3), 3))
  g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 3))
  for (const [name, size] of [
    ['aHead', 3],
    ['aTail', 3],
    ['aAge', 1],
  ] as const) {
    const attr = new THREE.BufferAttribute(new Float32Array(VERTS * size), size)
    attr.setUsage(THREE.DynamicDrawUsage)
    if (name === 'aAge') attr.array.fill(-1)
    g.setAttribute(name, attr)
  }
  g.setIndex(new THREE.BufferAttribute(index, 1))
  return g
}

/**
 * The sparks of the four cuts (Act 7): per cut a short flash and thin hot streaks from the point where the ring's sprue
 * meets the trunk. A pure function of birth.cut* (sparkMath.ts), so it scrubs both ways; the buffers are rewritten only
 * when a cut value changes (no allocation, no React state). Additive, no depth write, inside the single canvas.
 */
export function Sparks() {
  const geometry = useMemo(buildGeometry, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uViewport: { value: new THREE.Vector2(1920, 1080) }, uWidth: { value: SPARKS.width }, uFlash: { value: SPARKS.flashSize } },
        transparent: true,
        side: THREE.DoubleSide, // the quad's winding follows the screen direction of the streak
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        premultipliedAlpha: true,
      }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  const bursts = useMemo(
    () =>
      CUT_ORDER.map((slot) => {
        const origin = cutPoint(slot, new THREE.Vector3())
        return { origin, set: buildSparks(1000 + slot * 37, cutOutDir(slot, new THREE.Vector3())) }
      }),
    [],
  )
  const last = useMemo(() => new Float32Array(BURSTS).fill(NaN), [])
  const gl = useThree((s) => s.gl)
  const size = useMemo(() => new THREE.Vector2(), [])
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const loading = getAppState().phase === 'loading'
    let changed = false
    let active = false
    for (let k = 0; k < BURSTS; k++) {
      const c = cutOf(birth, CUT_ORDER[k])
      if (c > 0 && c < SPARKS.life[1]) active = true
      if (c !== last[k]) changed = true
    }
    if (changed) {
      const head = geometry.getAttribute('aHead') as THREE.BufferAttribute
      const tail = geometry.getAttribute('aTail') as THREE.BufferAttribute
      const age = geometry.getAttribute('aAge') as THREE.BufferAttribute
      for (let k = 0; k < BURSTS; k++) {
        last[k] = cutOf(birth, CUT_ORDER[k])
        writeBurst(bursts[k].set, bursts[k].origin, last[k], k * QUADS_PER_BURST, head.array as Float32Array, tail.array as Float32Array, age.array as Float32Array)
      }
      head.needsUpdate = true
      tail.needsUpdate = true
      age.needsUpdate = true
    }
    gl.getDrawingBufferSize(size)
    material.uniforms.uViewport.value.copy(size)
    // Widths are px at 1080 p; scale them with the drawing buffer.
    const s = size.y / 1080
    material.uniforms.uWidth.value = SPARKS.width * s
    material.uniforms.uFlash.value = SPARKS.flashSize * s
    mesh.visible = loading || active
  })

  // frustumCulled off: the bounding sphere of the zero 'position' attribute is meaningless.
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />
}
