import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { BufferGeometry } from 'three'
import { mulberry32 } from '../../lib/random'
import { story } from '../../story/store'
import { useRingGeometry } from '../ring/useRingGeometry'
import { ParticleCloud, type ParticleCloudState } from './ParticleCloud'
import { resinStream, sampleSurface, type ParticleBuffers } from './particleData'

const PARTICLES = 24000
/** Points take on a pale resin green as they settle into the bed (scene light, not a UI accent). */
const RESIN_LIGHT = '#a6f2c4'

const cache = new WeakMap<BufferGeometry, ParticleBuffers>()

/**
 * One particle system across acts 1-2 (world space): the dissolving CAD ring pours into the resin bed, and the
 * print is fed from it point by point. Driven only by story.stream (Act 1 writes fall/opacity, Act 2 writes feed).
 */
export function ResinStream() {
  const ring = useRingGeometry()
  const buffers = useMemo(() => {
    let b = cache.get(ring)
    if (!b) {
      b = resinStream(sampleSurface(ring, PARTICLES, mulberry32(11)), mulberry32(12))
      cache.set(ring, b)
    }
    return b
  }, [ring])
  const state = useMemo<ParticleCloudState>(() => ({ progress: 0, opacity: 0, feed: 0 }), [])

  useFrame(() => {
    state.progress = story.stream.fall
    state.opacity = story.stream.opacity
    state.feed = story.stream.feed
  })

  return <ParticleCloud buffers={buffers} state={state} tint={RESIN_LIGHT} />
}
