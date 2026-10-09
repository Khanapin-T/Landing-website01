import { stepIndex } from '../../hud/stepIndex'
import { BIRTH_BEATS } from './beats'

/** Step start screens, in list order (Cut off, Acid, Polish). */
export const STEP_STARTS: readonly number[] = [BIRTH_BEATS.steps.cut, BIRTH_BEATS.steps.acid, BIRTH_BEATS.steps.polish]

export function stepAt(screen: number): number {
  return stepIndex(STEP_STARTS, screen)
}
