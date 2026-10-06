import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createXrayMaterial } from './xrayMaterial'

describe('createXrayMaterial', () => {
  it('is an additive, depth-write-free, double-sided shader material', () => {
    const { material } = createXrayMaterial('#7fdcff')
    expect(material).toBeInstanceOf(THREE.ShaderMaterial)
    expect(material.transparent).toBe(true)
    expect(material.depthWrite).toBe(false)
    expect(material.blending).toBe(THREE.AdditiveBlending)
    expect(material.side).toBe(THREE.DoubleSide)
    expect(material.premultipliedAlpha).toBe(true)
  })

  it('starts invisible and exposes its alpha and color as uniforms', () => {
    const { uniforms } = createXrayMaterial('#7fdcff', { power: 2, base: 0.05 })
    expect(uniforms.uAlpha.value).toBe(0)
    expect(uniforms.uPower.value).toBe(2)
    expect(uniforms.uBase.value).toBe(0.05)
    expect(uniforms.uColor.value).toBeInstanceOf(THREE.Color)
  })

  it('shares one program across instances', () => {
    expect(createXrayMaterial('#fff').material.customProgramCacheKey()).toBe(createXrayMaterial('#000').material.customProgramCacheKey())
  })
})
