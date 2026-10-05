import { PRINT_BEATS } from './beats'

export type ChipState = 'hidden' | 'sending' | 'printing' | 'done'

/** Chip state for a scroll position. State-based so jumps across several cues land in the right state. */
export function chipStateAt(screen: number): ChipState {
  if (screen < PRINT_BEATS.chipIn) return 'hidden'
  if (screen < PRINT_BEATS.printFrom) return 'sending'
  if (screen < PRINT_BEATS.printTo) return 'printing'
  return 'done'
}
