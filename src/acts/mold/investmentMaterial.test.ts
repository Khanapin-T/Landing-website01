import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import {
  BACK_ALPHA,
  FRONT_ALPHA,
  INVESTMENT_RENDER_ORDER,
  LEVEL_OFF,
  createInvestmentMaterial,
  createInvestmentUniforms,
  type InvestmentPart,
} from './investmentMaterial'

const PARTS: InvestmentPart[] = ['back', 'front', 'surface', 'stream']

function fakeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: [
      '#include <common>',
      'void main() {',
      '#include <beginnormal_vertex>',
      '#include <begin_vertex>',
      '#include <worldpos_vertex>',
      '}',
    ].join('\n'),
    fragmentShader: [
      '#include <common>',
      '#include <clipping_planes_fragment>',
      '#include <color_fragment>',
      '#include <opaque_fragment>',
    ].join('\n'),
  }
}

function compile(material: THREE.Material, shader: ReturnType<typeof fakeShader>) {
  material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
  return shader
}

describe('investment material', () => {
  it('is a standard material (no transmission)', () => {
    for (const part of PARTS) {
      const { material } = createInvestmentMaterial(part)
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
      expect(material).not.toBeInstanceOf(THREE.MeshPhysicalMaterial)
    }
  })

  it('injects the level discard and the shared uniforms', () => {
    const shared = createInvestmentUniforms()
    const { material, uniforms } = createInvestmentMaterial('front', shared)
    const shader = compile(material, fakeShader())
    expect(shader.uniforms.uLevelY).toBe(shared.uLevelY)
    expect(shader.uniforms.uTime).toBe(shared.uTime)
    expect(shader.uniforms.uBoil).toBe(shared.uBoil)
    expect(shader.uniforms.uClip).toBe(uniforms.uClip)
    expect(shader.vertexShader).toContain('vInvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;')
    expect(shader.fragmentShader).toContain('uniform float uLevelY;')
    expect(shader.fragmentShader).toContain('if (uClip > 0.5 && vInvWorldY > uLevelY) discard;')
  })

  it('shares one level between the halves and the surface', () => {
    const shared = createInvestmentUniforms()
    const back = createInvestmentMaterial('back', shared)
    const front = createInvestmentMaterial('front', shared)
    const surface = createInvestmentMaterial('surface', shared)
    expect(back.uniforms.uLevelY).toBe(front.uniforms.uLevelY)
    expect(surface.uniforms.uLevelY).toBe(front.uniforms.uLevelY)
  })

  it('clips the body halves at the level but not the surface or the stream', () => {
    expect(createInvestmentMaterial('back').uniforms.uClip.value).toBe(1)
    expect(createInvestmentMaterial('front').uniforms.uClip.value).toBe(1)
    expect(createInvestmentMaterial('surface').uniforms.uClip.value).toBe(0)
    expect(createInvestmentMaterial('stream').uniforms.uClip.value).toBe(0)
  })

  it('finds every anchor in the real three standard shader', () => {
    const { material } = createInvestmentMaterial('surface')
    const shader = compile(material, {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    })
    for (const line of ['uniform float uBoil;', 'float invDisp = 0.0;', 'transformed.y += invDisp;', 'vInvWorldY = (modelMatrix']) {
      expect(shader.vertexShader).toContain(line)
    }
    for (const line of ['uniform float uLevelY;', 'vInvWorldY > uLevelY) discard;', 'uFoamColor', 'uFresnel * invFres']) {
      expect(shader.fragmentShader).toContain(line)
    }
    // The displacement must come after `transformed` is declared, the normal after `objectNormal`.
    expect(shader.vertexShader.indexOf('transformed.y += invDisp;')).toBeGreaterThan(shader.vertexShader.indexOf('vec3 transformed'))
    expect(shader.vertexShader.indexOf('objectNormal = normalize(')).toBeGreaterThan(shader.vertexShader.indexOf('vec3 objectNormal'))
    // The alpha/fresnel block must sit before the final color write.
    expect(shader.fragmentShader.indexOf('uFresnel * invFres')).toBeLessThan(shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  })

  it('keeps one program key for every part and state (uniforms only)', () => {
    const keys = PARTS.map((p) => createInvestmentMaterial(p).material.customProgramCacheKey())
    expect(new Set(keys).size).toBe(1)
    const { material, uniforms } = createInvestmentMaterial('front')
    const key = material.customProgramCacheKey()
    uniforms.uLevelY.value = 0.5
    uniforms.uBoil.value = 1
    expect(material.customProgramCacheKey()).toBe(key)
  })

  it('injects the same source for every part (the program is shared)', () => {
    const [a, ...rest] = PARTS.map((p) => compile(createInvestmentMaterial(p).material, fakeShader()))
    for (const s of rest) {
      expect(s.vertexShader).toBe(a.vertexShader)
      expect(s.fragmentShader).toBe(a.fragmentShader)
    }
  })

  it('starts with the level below the flask bottom', () => {
    expect(LEVEL_OFF).toBeLessThan(MOLD.flask.bottomY)
    expect(createInvestmentUniforms().uLevelY.value).toBe(LEVEL_OFF)
  })

  it('sets up the layers: back nearly opaque, front ghosted with fresnel', () => {
    const back = createInvestmentMaterial('back')
    expect(back.material.side).toBe(THREE.BackSide)
    expect(back.material.transparent).toBe(true)
    expect(back.material.opacity).toBe(BACK_ALPHA)
    expect(BACK_ALPHA).toBeGreaterThan(0.9)

    const front = createInvestmentMaterial('front')
    expect(front.material.side).toBe(THREE.FrontSide)
    expect(front.material.transparent).toBe(true)
    expect(front.material.depthWrite).toBe(false)
    expect(front.material.opacity).toBe(FRONT_ALPHA)
    expect(FRONT_ALPHA).toBeLessThan(0.3)
    expect(front.uniforms.uFresnel.value).toBeGreaterThan(0)
    expect(back.uniforms.uFresnel.value).toBe(0)

    expect(INVESTMENT_RENDER_ORDER.back).toBe(12)
    expect(INVESTMENT_RENDER_ORDER.front).toBe(13)
    expect(INVESTMENT_RENDER_ORDER.surface).toBeGreaterThan(INVESTMENT_RENDER_ORDER.back)
    expect(INVESTMENT_RENDER_ORDER.surface).toBeLessThan(INVESTMENT_RENDER_ORDER.front)
  })

  it('marks only the surface as displaced and only the stream as wobbling', () => {
    const surface = createInvestmentMaterial('surface')
    expect(surface.uniforms.uSurface.value).toBe(1)
    expect(surface.uniforms.uStream.value).toBe(0)
    expect(surface.material.side).toBe(THREE.DoubleSide)
    expect(surface.material.forceSinglePass).toBe(true)
    const stream = createInvestmentMaterial('stream')
    expect(stream.uniforms.uStream.value).toBe(1)
    expect(stream.uniforms.uSurface.value).toBe(0)
    expect(stream.material.transparent).toBe(false)
  })
})
