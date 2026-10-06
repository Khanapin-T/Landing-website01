/** Current step for a scroll position: -1 before the first, else the last step whose start is <= screen. */
export function stepIndex(starts: readonly number[], screen: number): number {
  let current = -1
  for (let i = 0; i < starts.length; i++) {
    if (screen >= starts[i]) current = i
  }
  return current
}
