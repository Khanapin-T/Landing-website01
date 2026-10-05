import type { Phase } from './appState'

/** Act objects render while loading (so Precompile compiles them) and inside their scroll window afterwards. */
export function shouldRender(phase: Phase, screen: number, from: number, to: number): boolean {
  return phase === 'loading' || (screen >= from && screen <= to)
}
