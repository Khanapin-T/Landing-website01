import { MOLD_BEATS } from './beats'

const STARTS = [
  MOLD_BEATS.steps.tree,
  MOLD_BEATS.steps.flask,
  MOLD_BEATS.steps.tape,
  MOLD_BEATS.steps.investment,
  MOLD_BEATS.steps.vacuum,
  MOLD_BEATS.steps.tapeOff,
] as const

/** Step start screens, in list order. */
export const STEP_STARTS: readonly number[] = STARTS

/** Current step for a scroll position: -1 before the first, else the last step whose start is <= screen. */
export function stepAt(screen: number): number {
  let current = -1
  for (let i = 0; i < STARTS.length; i++) {
    if (screen >= STARTS[i]) current = i
  }
  return current
}
