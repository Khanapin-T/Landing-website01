import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { GradeEffect } from './fx/GradeEffect'
import { LensEffect } from './fx/LensEffect'
import { story } from '../story/store'

/** The single post-processing chain used on every screen. */
export function PostFX() {
  const lens = useMemo(() => new LensEffect(), [])
  const grade = useMemo(() => new GradeEffect(), [])

  useEffect(() => () => {
    lens.dispose()
    grade.dispose()
  }, [lens, grade])

  useFrame(() => {
    grade.temperature = story.temperature
  })

  return (
    // Constant MSAA: changing it at runtime recreates the composer. Quality steps only touch DPR and particles.
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <primitive object={lens} dispose={null} />
      <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.85} luminanceSmoothing={0.15} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <primitive object={grade} dispose={null} />
      {/* Not premultiplied: the grain must also reach dark pixels to dither gradient banding. */}
      <Noise opacity={0.035} />
    </EffectComposer>
  )
}
