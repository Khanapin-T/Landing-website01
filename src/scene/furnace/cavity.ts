const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Opacity of the cavity outline: it appears as the tree burns away (burn 0.15 .. 0.9) and lives only while X-ray is on. */
export function cavityAlpha(xray: number, burn: number): number {
  return xray * smoothstep(0.15, 0.9, burn)
}
