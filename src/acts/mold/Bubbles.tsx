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
const BUBBLES = 160
/** Bubbles stay clear of the flask wall. */
const MAX_RADIUS = MOLD.flask.innerRadius - 0.1
/** Draws after the investment front layer (13) and before the steel front layer (14). */
const RENDER_ORDER = 13.5
/** Thick milk-white plaster. */
const BUBBLE_COLOR = '#f4f0e6'
/** Full dome diameter in world units (ring height = 1). */
const SIZE_MIN = 0.1
const SIZE_MAX = 0.28
/** Cycles per second. */
const SPEED_MIN = 0.15
const SPEED_MAX = 0.45
/** Share of the sprite frame the full dome takes; the rest is room for the burst ring and the contact shadow. */
const FRAME = 1.9

const f = (n: number) => n.toFixed(4)

// Point size: world units projected to drawing-buffer px (same projection as ParticleCloud).
// aData = (cycles/s, phase 0..1, size 0..1, rank 0..1).
// Life u in 0..1: 0..0.7 the dome swells from a point, 0.7..0.8 it holds, 0.8..1 it bursts (ring, fade).
const vertexShader = /* glsl */ `
attribute vec4 aData;
uniform float uTime;
uniform float uBoil;
uniform float uBottomY;
uniform float uLevelY;
uniform float uMaxR;
uniform float uScale; // half the drawing-buffer height in px
varying float vAlpha; // alive * born
varying float vR;     // dome radius in point-coord units (0.5 = sprite edge)
varying float vBurst; // 0..1 after the burst starts
void main() {
  float cycle = aData.y + uTime * aData.x;
  float u = fract(cycle);
  float id = floor(cycle);
  // A new spot on the surface every cycle, kept inside the wall.
  vec2 h = fract(sin(vec2(id * 12.9898 + aData.y * 78.233, id * 39.346 + aData.w * 11.135)) * 43758.5453);
  vec2 xz = position.xz + (h - 0.5) * 0.24;
  float rr = length(xz);
  if (rr > uMaxR) xz *= uMaxR / rr;
  float full = ${f(SIZE_MIN)} + fract(aData.z + id * 0.381) * ${f(SIZE_MAX - SIZE_MIN)};
  // Slow thick swell, a short hold with a faint tremor, then a last stretch right before the burst.
  float grow = smoothstep(0.0, 1.0, clamp(u / 0.7, 0.0, 1.0));
  float tremor = 1.0 + 0.025 * sin(uTime * 7.0 + aData.y * 50.0) * smoothstep(0.55, 0.7, u);
  float stretch = 1.0 + 0.14 * smoothstep(0.74, 0.8, u);
  float dome = full * grow * tremor * stretch;
  float burst = clamp((u - 0.8) / 0.2, 0.0, 1.0);
  // Lifted by 0.3 of the dome so the sprite does not sink into the surface plane.
  vec3 p = vec3(xz.x, uLevelY + 0.015 + dome * 0.3, xz.y);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = full * ${f(FRAME)} * uScale * projectionMatrix[1][1] / -mv.z;
  vR = 0.5 * grow * tremor * stretch / ${f(FRAME)};
  vBurst = burst;
  float born = smoothstep(0.0, 0.05, u);
  float alive = smoothstep(aData.w, aData.w + 0.12, uBoil);
  float ready = step(0.0001, uLevelY - uBottomY);
  vAlpha = born * alive * ready;
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying float vR;
varying float vBurst;

// Premultiplied-alpha "over".
vec4 over(vec4 top, vec4 bot) { return top + bot * (1.0 - top.a); }

void main() {
  vec2 pc = gl_PointCoord - 0.5;
  pc.y = -pc.y; // y up
  float d = length(pc);
  float R = max(vR, 0.0001);
  float t = d / R;
  vec2 dir = d > 0.0001 ? pc / d : vec2(0.0);
  // Light from the upper left.
  float lit = dot(dir, normalize(vec2(-0.55, 0.75)));

  float gone = 1.0 - smoothstep(0.0, 0.3, vBurst);

  // Contact shadow on the plaster just outside the dome, heavier on the lower right.
  float contact = (1.0 - smoothstep(1.0, 1.28, t)) * smoothstep(0.82, 1.0, t);
  float contactA = contact * (0.2 - 0.09 * lit) * gone;
  vec4 col = vec4(vec3(0.42, 0.40, 0.36) * contactA, contactA);

  // Dimple left behind by a burst bubble.
  float dimple = (1.0 - smoothstep(0.55, 1.0, t)) * smoothstep(0.0, 0.2, vBurst) * (1.0 - smoothstep(0.35, 1.0, vBurst));
  float dimpleA = dimple * 0.1;
  col = over(vec4(vec3(0.5, 0.48, 0.44) * dimpleA, dimpleA), col);

  // Dome: milk-white bulge, soft highlight crescent upper left, darker rim on the lower right.
  float inside = 1.0 - smoothstep(0.93, 1.0, t);
  float edge = smoothstep(0.5, 1.0, t);
  vec3 body = uColor * (1.0 - 0.07 * t * t);
  body *= 1.0 - edge * (0.1 + 0.2 * (0.5 - 0.5 * lit));
  float crescent = smoothstep(0.5, 0.74, t) * (1.0 - smoothstep(0.74, 0.93, t)) * smoothstep(0.0, 0.8, lit);
  float spec = 1.0 - smoothstep(0.0, 0.2, length(pc / R - vec2(-0.34, 0.38)));
  body = mix(body, vec3(1.0), clamp(crescent * 0.75 + spec * 0.6, 0.0, 1.0));
  float rimLine = smoothstep(0.88, 0.97, t) * (1.0 - smoothstep(0.97, 1.0, t));
  body = mix(body, uColor * 0.62, rimLine * 0.55);
  float domeA = inside * 0.94 * gone;
  col = over(vec4(body * domeA, domeA), col);

  // Burst ring: thin, expands, fades.
  float ringR = mix(R, 0.46, 1.0 - pow(1.0 - vBurst, 2.0));
  float w = 0.014 + 0.012 * vBurst;
  float ring = (1.0 - smoothstep(w * 0.4, w, abs(d - ringR))) * pow(1.0 - vBurst, 1.4) * step(0.001, vBurst);
  float ringA = ring * 0.75;
  vec3 ringCol = mix(uColor * 0.68, vec3(1.0), 0.35 + 0.3 * lit);
  col = over(vec4(ringCol * ringA, ringA), col);

  col *= vAlpha * uOpacity;
  if (col.a < 0.003) discard;
  gl_FragColor = col;
}
`

/**
 * Vacuum beat: the thick investment boils at its surface. Domes swell from points, hold, and burst with a ring.
 * Lives in flask-local space (inside the flask rig, outside the spinner). Ambient motion is time-based; the number
 * of live bubbles follows `mold.boil`.
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
      data[i * 4] = SPEED_MIN + rand() * (SPEED_MAX - SPEED_MIN)
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
          uMaxR: { value: MAX_RADIUS },
          uScale: { value: 540 },
          uColor: { value: new THREE.Color(BUBBLE_COLOR) },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
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

  // frustumCulled off: the bounding sphere is a flat disc at y = 0, the surface sits elsewhere.
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={RENDER_ORDER} />
}
