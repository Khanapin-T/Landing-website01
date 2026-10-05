export type Vec3 = [number, number, number]

export interface Box {
  min: Vec3
  max: Vec3
}

/** Apply as: p' = (p + offset) * scale. Centers the box at the origin, height (Y) = targetHeight. */
export interface Normalization {
  offset: Vec3
  scale: number
}

export function computeNormalization(box: Box, targetHeight: number): Normalization {
  const height = box.max[1] - box.min[1]
  if (!(height > 0)) throw new Error(`Ring model has no height (got ${height})`)
  const offset: Vec3 = [
    -(box.min[0] + box.max[0]) / 2,
    -(box.min[1] + box.max[1]) / 2,
    -(box.min[2] + box.max[2]) / 2,
  ]
  return { offset, scale: targetHeight / height }
}
