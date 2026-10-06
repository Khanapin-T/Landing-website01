export type ActId = 'intro' | 'idea' | 'print' | 'mold' | 'fire' | 'gold' | 'birth'

export interface ActDef {
  id: ActId
  /** Scroll length in screens (1 screen = 100vh). */
  screens: number
  /** Frame temperature reached at the end of the act: 0 cold blueprint, 0.5 neutral, 1 molten. */
  temperature: number
  /** Screens into the act where a chapter click lands. Default DEFAULT_ENTRY. */
  entry?: number
}

/** Small step past the act start so pixel rounding never lands on the previous act. */
export const DEFAULT_ENTRY = 0.01

/** Story order and lengths (spec section 3). 'birth' includes the final hold. Tune by eye. */
export const ACTS: readonly ActDef[] = [
  { id: 'intro', screens: 0.5, temperature: 0 },
  { id: 'idea', screens: 2, temperature: 0, entry: 0.6 },
  { id: 'print', screens: 1.5, temperature: 0.1, entry: 0.6 },
  { id: 'mold', screens: 2.5, temperature: 0.15, entry: 0.5 },
  { id: 'fire', screens: 2.5, temperature: 0.8, entry: 0.5 },
  { id: 'gold', screens: 2.5, temperature: 1 },
  { id: 'birth', screens: 3, temperature: 0.6 },
]

export const TOTAL_SCREENS = ACTS.reduce((sum, a) => sum + a.screens, 0)

export interface ActWindow {
  id: ActId
  /** Start and end in screens from the top of the track. */
  start: number
  end: number
  /** Where a chapter click lands, in screens from the top. */
  entry: number
}

export function actWindows(acts: readonly ActDef[] = ACTS): ActWindow[] {
  let t = 0
  return acts.map((a) => {
    const w = { id: a.id, start: t, end: t + a.screens, entry: t + (a.entry ?? DEFAULT_ENTRY) }
    t += a.screens
    return w
  })
}

const WINDOWS = actWindows()

function clampScreen(screen: number, windows: readonly ActWindow[]): number {
  if (Number.isNaN(screen)) return 0
  return Math.min(Math.max(screen, 0), windows.at(-1)!.end)
}

/** Window containing `screen` (end-exclusive; the last window includes its end). */
export function actAt(screen: number, windows: readonly ActWindow[] = WINDOWS): ActWindow {
  const s = clampScreen(screen, windows)
  return windows.find((w) => s >= w.start && s < w.end) ?? windows.at(-1)!
}

export function actLocalProgress(screen: number, win: ActWindow): number {
  const p = (screen - win.start) / (win.end - win.start)
  return Number.isNaN(p) ? 0 : Math.min(Math.max(p, 0), 1)
}

/** Piecewise-linear frame temperature: each act blends from the previous act's value to its own. */
export function temperatureAt(screen: number, acts: readonly ActDef[] = ACTS): number {
  const windows = acts === ACTS ? WINDOWS : actWindows(acts)
  const win = actAt(screen, windows)
  const i = windows.indexOf(win)
  const from = i === 0 ? acts[0].temperature : acts[i - 1].temperature
  const to = acts[i].temperature
  return from + (to - from) * actLocalProgress(clampScreen(screen, windows), win)
}
