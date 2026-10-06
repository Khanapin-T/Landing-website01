import * as THREE from 'three'

export interface XrayMaterialHandle {
  material: THREE.ShaderMaterial
  uniforms: {
    uColor: { value: THREE.Color }
    uAlpha: { value: number }
    uPower: { value: number }
    uBase: { value: number }
  }
}

const vertexShader = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

// Premultiplied additive output (see ParticleCloud): a fresnel shell, bright at the silhouette, faint in the middle.
const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uPower;
uniform float uBase;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
  float a = (uBase + (1.0 - uBase) * f) * uAlpha;
  gl_FragColor = vec4(uColor * a, a);
}
`

/**
 * The X-ray look: an additive fresnel shell. `power` = how tightly the glow hugs the silhouette, `base` = the glow of
 * the face-on middle. Color may be HDR (crosses the bloom threshold). All instances share one program.
 */
export function createXrayMaterial(color: THREE.ColorRepresentation, { power = 2, base = 0.06 }: { power?: number; base?: number } = {}): XrayMaterialHandle {
  const uniforms: XrayMaterialHandle['uniforms'] = {
    uColor: { value: new THREE.Color(color) },
    uAlpha: { value: 0 },
    uPower: { value: power },
    uBase: { value: base },
  }
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    premultipliedAlpha: true,
  })
  material.customProgramCacheKey = () => 'xray-fresnel-v1'
  return { material, uniforms }
}
