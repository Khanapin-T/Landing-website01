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

  it('does not push back by default (polygon offset off)', () => {
    const { material } = createXrayMaterial('#7fdcff')
    expect(material.polygonOffset).toBe(false)
  })

  it('pushBack sets a polygon offset behind coplanar surfaces without changing the program', () => {
    const plain = createXrayMaterial('#7fdcff').material
    const { material } = createXrayMaterial('#7fdcff', { pushBack: true })
    expect(material.polygonOffset).toBe(true)
    expect(material.polygonOffsetFactor).toBe(2)
    expect(material.polygonOffsetUnits).toBe(4)
    expect(material.customProgramCacheKey()).toBe('xray-fresnel-v1')
    expect(material.customProgramCacheKey()).toBe(plain.customProgramCacheKey())
  })

  it('shares one program across instances', () => {
    expect(createXrayMaterial('#fff').material.customProgramCacheKey()).toBe(createXrayMaterial('#000').material.customProgramCacheKey())
  })
})
