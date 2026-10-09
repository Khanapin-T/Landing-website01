const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** "mm:ss" of a rest timer at progress `rest` (0..1) of `seconds` (default 10 minutes), clamped. */
export function restClock(rest: number, seconds = 600): string {
  const s = Math.round(clamp01(rest) * seconds)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
