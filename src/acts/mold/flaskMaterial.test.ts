import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import {
  FLANGE,
  FRONT_ALPHA,
  HOLE_BAND,
  HOLE_COLUMNS,
  HOLE_RADIUS,
  HOLE_ROWS,
  OUTLINE_WIDTH,
  createFlaskMaterial,
  flaskHoleDistance,
  holeCenters,
} from './flaskMaterial'

const H = MOLD.flask.height
const R = MOLD.flask.innerRadius + MOLD.flask.wall

function fakeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: ['#include <common>', 'void main() {', '#include <begin_vertex>', '}'].join('\n'),
    fragmentShader: [
      '#include <common>',
      'void main() {',
      '#include <clipping_planes_fragment>',
      '#include <normal_fragment_begin>',
      '#include <opaque_fragment>',
      '}',
    ].join('\n'),
  }
}

function compile(side: 'back' | 'front', real = false) {
  const handle = createFlaskMaterial(side)
  const shader = real
    ? { uniforms: {} as Record<string, THREE.IUniform>, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader }
    : fakeShader()
  handle.material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
  return { ...handle, shader }
}

describe('flask material', () => {
  it('builds the back half as opaque inner steel and the front half as a ghosted outline', () => {
    const back = createFlaskMaterial('back')
    expect(back.material.side).toBe(THREE.BackSide)
    expect(back.material.transparent).toBe(false)
    expect(back.material.depthWrite).toBe(true)
    expect(back.uniforms.uGhost.value).toBe(0)

    const front = createFlaskMaterial('front')
    expect(front.material.side).toBe(THREE.FrontSide)
    expect(front.material.transparent).toBe(true)
    expect(front.material.depthWrite).toBe(false)
    expect(front.uniforms.uGhost.value).toBe(1)
    expect(front.uniforms.uAlpha.value).toBeCloseTo(FRONT_ALPHA)
  })

  it('is brushed steel', () => {
    const { material } = createFlaskMaterial('back')
    expect(material.metalness).toBe(1)
    expect(material.roughness).toBeCloseTo(0.38)
    expect(material.color.getHexString()).toBe('9aa3ad')
  })

  it('injects the hole pattern, the discard and the ghost/outline block', () => {
    const { shader, uniforms } = compile('front')
    expect(shader.uniforms.uGhost).toBe(uniforms.uGhost)
    expect(shader.uniforms.uAlpha).toBe(uniforms.uAlpha)
    expect(shader.uniforms.uOutlineColor).toBe(uniforms.uOutlineColor)
    expect(shader.uniforms.uRimColor).toBe(uniforms.uRimColor)
    expect(shader.vertexShader).toContain('varying vec3 vFlaskLocal;')
    expect(shader.vertexShader).toContain('vFlaskLocal = position;')
    expect(shader.fragmentShader).toContain('float flaskHoleDistance(vec3 p)')
    expect(shader.fragmentShader).toMatch(/if \(flaskHole < -flaskAA \* uGhost\) discard;/)
    expect(shader.fragmentShader).toContain('uOutlineColor')
    expect(shader.fragmentShader).toContain('diffuseColor.a = mix(1.0,')
  })

  it('bakes the layout numbers into the shader', () => {
    const { shader } = compile('back')
    expect(shader.fragmentShader).toContain(`#define HOLE_COLUMNS ${HOLE_COLUMNS.toFixed(1)}`)
    expect(shader.fragmentShader).toContain(`#define HOLE_ROWS ${HOLE_ROWS.toFixed(1)}`)
    expect(shader.fragmentShader).toContain(`#define HOLE_RADIUS ${HOLE_RADIUS.toFixed(6)}`)
    expect(shader.fragmentShader).toContain(`#define FLASK_R ${R.toFixed(6)}`)
    expect(shader.fragmentShader).toContain(`#define FLASK_H ${H.toFixed(6)}`)
  })

  it('finds every anchor in the real three standard shader, with the block before the final color write', () => {
    const { shader } = compile('front', true)
    expect(shader.vertexShader).toContain('vFlaskLocal = position;')
    expect(shader.fragmentShader).toContain('uniform float uGhost;')
    expect(shader.fragmentShader).toContain('discard;')
    expect(shader.fragmentShader).toContain('float flaskHoleDistance(vec3 p)')
    const block = shader.fragmentShader.indexOf('diffuseColor.a = mix(1.0,')
    expect(block).toBeGreaterThan(shader.fragmentShader.indexOf('#include <normal_fragment_begin>'))
    expect(block).toBeLessThan(shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  })

  it('keeps one program key for both halves and across uniform changes', () => {
    const back = createFlaskMaterial('back')
    const front = createFlaskMaterial('front')
    const key = back.material.customProgramCacheKey()
    expect(front.material.customProgramCacheKey()).toBe(key)
    front.uniforms.uAlpha.value = 0.5
    front.uniforms.uGhost.value = 0
    expect(front.material.customProgramCacheKey()).toBe(key)
  })
})

describe('hole pattern', () => {
  const centers = holeCenters()

  it('has HOLE_COLUMNS holes per row and HOLE_ROWS staggered rows', () => {
    expect(centers.length).toBe(HOLE_COLUMNS * HOLE_ROWS)
  })

  it('puts a hole facing the camera on the first row (azimuth -PI/2)', () => {
    expect(flaskHoleDistance(centers[0].y, -Math.PI / 2)).toBeCloseTo(-HOLE_RADIUS)
  })

  it('reports a negative distance inside each hole and the hole radius at its edge', () => {
    for (const c of centers) {
      expect(flaskHoleDistance(c.y, c.azimuth)).toBeCloseTo(-HOLE_RADIUS)
      expect(flaskHoleDistance(c.y + HOLE_RADIUS, c.azimuth)).toBeCloseTo(0, 5)
    }
  })

  it('leaves solid steel between holes (outlines never touch) and across the azimuth seam', () => {
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const a = centers[i]
        const b = centers[j]
        const da = Math.abs(((a.azimuth - b.azimuth + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * R
        expect(Math.hypot(da, a.y - b.y)).toBeGreaterThan(2 * (HOLE_RADIUS + OUTLINE_WIDTH) + 0.05)
      }
    }
    // The pattern is continuous across atan's jump at +-PI.
    for (const y of [centers[0].y, centers[HOLE_COLUMNS].y, 0.3]) {
      expect(flaskHoleDistance(y, Math.PI - 1e-6)).toBeCloseTo(flaskHoleDistance(y, -Math.PI + 1e-6), 4)
    }
  })

  it('keeps every hole inside the band, clear of the bottom flange and the top rim', () => {
    for (const c of centers) {
      expect(c.y - HOLE_RADIUS - OUTLINE_WIDTH).toBeGreaterThan(-H / 2 + FLANGE.height)
      expect(c.y + HOLE_RADIUS + OUTLINE_WIDTH).toBeLessThan(H / 2 - HOLE_BAND.top / 2)
    }
    // Plain steel below the first row and above the last.
    expect(flaskHoleDistance(-H / 2 + 0.01, -Math.PI / 2)).toBeGreaterThan(0.05)
    expect(flaskHoleDistance(H / 2 - 0.01, -Math.PI / 2)).toBeGreaterThan(0.05)
  })
})
