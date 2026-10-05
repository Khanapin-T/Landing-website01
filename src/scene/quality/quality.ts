export interface QualityStep {
  /** Max device pixel ratio for the canvas. */
  dpr: number
  /** Multiplier for particle counts in act sessions. */
  particleScale: number
}

/**
 * Ordered from most to least expensive: DPR first, then particle counts.
 * Post-processing settings are deliberately NOT stepped: changing MSAA or bloom options
 * rebuilds the composer and recompiles shaders mid-scroll (a visible hitch).
 */
export const QUALITY_STEPS: readonly QualityStep[] = [
  { dpr: 1.5, particleScale: 1 },
  { dpr: 1.25, particleScale: 1 },
  { dpr: 1, particleScale: 1 },
  { dpr: 1, particleScale: 0.6 },
]

/** First step whose DPR the device can actually show (no wasted steps on low-DPR screens). */
export function initialStep(deviceDpr: number): number {
  const i = QUALITY_STEPS.findIndex((s) => s.dpr <= deviceDpr + 1e-6)
  return i === -1 ? QUALITY_STEPS.length - 1 : i
}

export function stepDown(i: number): number {
  return Math.min(i + 1, QUALITY_STEPS.length - 1)
}

export function stepUp(i: number, floor: number): number {
  return Math.max(i - 1, floor)
}

export function effectiveDpr(step: QualityStep, deviceDpr: number): number {
  return Math.min(step.dpr, deviceDpr)
}
