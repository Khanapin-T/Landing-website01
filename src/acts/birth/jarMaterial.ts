import * as THREE from 'three'
import { ACID_Y, JAR_FLOOR_Y } from '../../config/birth'

/**
 * Look of the acid (the author: vivid, transparent, luminous acid green; the rings must stay readable inside).
 * It is added light, not a tint: every number is an intensity of `color` that is ADDED to what is behind it, so the
 * gold rings keep their shading. base = flat body, rim = extra at grazing angles (volume), depth = extra toward the
 * surface, surface = the top face, meniscus = the bright line on the walls just under the surface (width in world units).
 * Values above ~0.85 bloom. Tune by eye.
 */
export const ACID_LOOK = {
  color: '#7dff1a',
  base: 0.14,
  rim: 0.5,
  rimPower: 2.0,
  depth: 0.16,
  surface: 0.7,
  meniscus: 1.2,
  meniscusWidth: 0.09,
} as const

/** The jar glass: base tint, opacity, the bright edge highlight (rim intensity and colour). */
export const GLASS_LOOK = { color: '#eef6f2', opacity: 0.08, envMapIntensity: 1.4, rim: 0.9, rimColor: '#d6ffc4' } as const

const acidVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying float vY;
varying float vTop;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalMatrix * normal;
  vV = -mv.xyz;
  vY = position.y;
  vTop = step(0.5, normal.y);
  gl_Position = projectionMatrix * mv;
}`

const acidFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uBase;
uniform float uRim;
uniform float uRimPower;
uniform float uDepth;
uniform float uSurface;
uniform float uMeniscus;
uniform float uMeniscusWidth;
uniform float uFloorY;
uniform float uTopY;
varying vec3 vN;
varying vec3 vV;
varying float vY;
varying float vTop;
void main() {
  float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uRimPower);
  float h = clamp((vY - uFloorY) / (uTopY - uFloorY), 0.0, 1.0);
  float band = smoothstep(uTopY - uMeniscusWidth, uTopY, vY) * (1.0 - vTop);
  float k = mix(uBase + uRim * fr + uDepth * h + uMeniscus * band, uSurface + uRim * 0.5 * fr, vTop);
  gl_FragColor = vec4(uColor * k, 1.0);
}`

/**
 * Thin clear glass: low base opacity, more opaque toward grazing angles (fresnel), so the walls read as glass and
 * the rings show through, plus a bright edge highlight at those angles. No transmission. `rim` scales the highlight
 * (the other vessels use a weaker one); one shader program for all of them.
 */
export function createGlassMaterial(
  look: { color: string; opacity: number; envMapIntensity: number; rim: number; rimColor?: string } = GLASS_LOOK,
): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: look.color,
    metalness: 0,
    roughness: 0.05,
    envMapIntensity: look.envMapIntensity,
    transparent: true,
    opacity: look.opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const rimColor = new THREE.Color(look.rimColor ?? GLASS_LOOK.rimColor)
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: look.rim }
    shader.uniforms.uRimColor = { value: rimColor }
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uRim;\nuniform vec3 uRimColor;\nvoid main() {')
      .replace(
        '#include <opaque_fragment>',
        `{
        float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
        diffuseColor.a = clamp(diffuseColor.a + fr * 0.5, 0.0, 1.0);
        outgoingLight += uRimColor * (fr * uRim);
      }
      #include <opaque_fragment>`,
      )
  }
  m.customProgramCacheKey = () => 'jar-glass-v2'
  return m
}

/**
 * The acid body: a luminous green, additive, see-through (no lights, no transmission). Local y of the geometry is
 * world y with the jar in place, so the surface and floor heights are the config constants.
 */
export function createAcidMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: acidVertex,
    fragmentShader: acidFragment,
    uniforms: {
      uColor: { value: new THREE.Color(ACID_LOOK.color) },
      uBase: { value: ACID_LOOK.base },
      uRim: { value: ACID_LOOK.rim },
      uRimPower: { value: ACID_LOOK.rimPower },
      uDepth: { value: ACID_LOOK.depth },
      uSurface: { value: ACID_LOOK.surface },
      uMeniscus: { value: ACID_LOOK.meniscus },
      uMeniscusWidth: { value: ACID_LOOK.meniscusWidth },
      uFloorY: { value: JAR_FLOOR_Y },
      uTopY: { value: ACID_Y },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}
