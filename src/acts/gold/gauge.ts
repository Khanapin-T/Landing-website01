/** Gauge dial in a 160 x 160 viewBox. Angles run clockwise from 12 o'clock. */
export const GAUGE = { startDeg: -120, endDeg: 120, ticks: 9, center: 80, tickInner: 60, tickOuter: 68, needle: 54 } as const

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Needle angle for a vacuum value: 0 = atmosphere (left end), 1 = full vacuum (right end). */
export function needleAngle(vacuum: number): number {
  return GAUGE.startDeg + (GAUGE.endDeg - GAUGE.startDeg) * clamp01(vacuum)
}

const point = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [GAUGE.center + r * Math.sin(a), GAUGE.center - r * Math.cos(a)]
}

/** Tick marks along the arc, no numbers (the site never states a pressure it was not given). */
export function tickLines(): { x1: number; y1: number; x2: number; y2: number }[] {
  return Array.from({ length: GAUGE.ticks }, (_, i) => {
    const deg = GAUGE.startDeg + ((GAUGE.endDeg - GAUGE.startDeg) * i) / (GAUGE.ticks - 1)
    const [x1, y1] = point(deg, GAUGE.tickInner)
    const [x2, y2] = point(deg, GAUGE.tickOuter)
    return { x1, y1, x2, y2 }
  })
}
