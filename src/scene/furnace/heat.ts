type Rgb = readonly [number, number, number]

/** Linear HDR stops: cold dark steel, dull red, red-orange, bright orange. Kept saturated: AGX tone mapping washes brighter or yellower values out to cream. */
const STOPS: readonly (readonly [number, Rgb])[] = [
  [0, [0.02, 0.022, 0.028]],
  [0.35, [0.55, 0.04, 0.015]],
  [0.7, [1.1, 0.16, 0.02]],
  [1, [1.7, 0.42, 0.06]],
]

/** Glow color of hot metal for a heat value 0..1 (used as emissive by the coils and the flask). */
export function heatColor(heat: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const h = Math.min(Math.max(heat, 0), 1)
  let i = 1
  while (i < STOPS.length - 1 && h > STOPS[i][0]) i++
  const [h0, c0] = STOPS[i - 1]
  const [h1, c1] = STOPS[i]
  const t = (h - h0) / (h1 - h0)
  out[0] = c0[0] + (c1[0] - c0[0]) * t
  out[1] = c0[1] + (c1[1] - c0[1]) * t
  out[2] = c0[2] + (c1[2] - c0[2]) * t
  return out
}
