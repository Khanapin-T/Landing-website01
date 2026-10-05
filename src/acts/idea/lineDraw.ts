import * as THREE from 'three'

export interface LineDrawOptions {
  /** Settled line color. */
  color: THREE.ColorRepresentation
  /** Pen-tip color (multiplied by hotIntensity so it crosses the bloom threshold). */
  hot: THREE.ColorRepresentation
  hotIntensity: number
  /** Draw progress needed to draw one segment end to end (> 0). Small for many short edges, large for few long lines. */
  span: number
  /** Opacity of lines behind the ring center (hidden-line feel). 1 = no fading. */
  back: number
}

export interface LineDrawHandle {
  material: THREE.ShaderMaterial
  uniforms: { uDraw: { value: number }; uOpacity: { value: number } }
}

const vertexShader = /* glsl */ `
attribute float aReveal;
attribute float aT;
varying float vReveal;
varying float vT;
varying float vDepth;
void main() {
  vReveal = aReveal;
  vT = aT;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vDepth = mv.z - center.z; // > 0: in front of the object's center
  gl_Position = projectionMatrix * mv;
}
`

const fragmentShader = /* glsl */ `
uniform float uDraw;
uniform float uOpacity;
uniform float uSpan;
uniform float uBack;
uniform vec3 uColor;
uniform vec3 uHot;
varying float vReveal;
varying float vT;
varying float vDepth;
void main() {
  // Scale so every segment (reveal <= 1) is fully drawn and its glow settled at uDraw = 1.
  float d = uDraw * (1.0 + 1.25 * uSpan);
  float p = (d - vReveal) / uSpan; // pen position along this segment, 0..1
  // >= (not >): at p = 0 nothing of the segment may survive, not even the fragment at its first vertex.
  if (vT >= p) discard;
  float tip = 1.0 - smoothstep(0.0, 0.25, p - vT);
  float facing = mix(uBack, 1.0, smoothstep(-0.12, 0.08, vDepth));
  vec3 col = mix(uColor, uHot, tip);
  gl_FragColor = vec4(col, uOpacity * max(facing, tip));
}
`

/** Lines that draw themselves along a per-segment order with a glowing pen tip (Act 1 edges and dimensions). */
export function createLineDrawMaterial(opts: LineDrawOptions): LineDrawHandle {
  const uniforms = { uDraw: { value: 0 }, uOpacity: { value: 1 } }
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      ...uniforms,
      uSpan: { value: opts.span },
      uBack: { value: opts.back },
      uColor: { value: new THREE.Color(opts.color) },
      uHot: { value: new THREE.Color(opts.hot).multiplyScalar(opts.hotIntensity) },
    },
    transparent: true,
    depthWrite: false,
  })
  return { material, uniforms }
}
