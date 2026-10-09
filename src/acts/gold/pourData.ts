import { arriveAt } from '../../config/gold'

/** Points sampled on each part of the tree for the pour (lighter than the burnout: it runs on a smaller screen area). */
export const POUR_COUNTS = { trunk: 500, ring: 1400, sprue: 140 } as const

export interface PourBuffers {
  /** Flask-frame position of each point on the tree (also the geometry's `position`). */
  position: Float32Array
  /** Fill value at which the front reaches the point (config/gold.ts `arriveAt`). */
  arrive: Float32Array
  seed: Float32Array
  count: number
}

export function pourBuffers(points: Float32Array, rand: () => number): PourBuffers {
  const count = points.length / 3
  const arrive = new Float32Array(count)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    arrive[i] = arriveAt(points[i * 3 + 1])
    seed[i] = rand()
  }
  return { position: points, arrive, seed, count }
}
