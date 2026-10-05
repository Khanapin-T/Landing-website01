/**
 * Scroll cues for DOM copy. Copy is never scrubbed: when the scroll crosses `at` (in screens) going down,
 * `enter` plays a time-based reveal; crossing it going up calls `leaveBack`. A stopped scroll never leaves
 * text half-revealed.
 */
export interface Cue {
  at: number
  enter: () => void
  leaveBack: () => void
}

const cues = new Set<Cue>()
let last = 0
const hits: Cue[] = []

/** Registers a cue; returns its disposer. A cue at or above the current position enters immediately. */
export function addCue(cue: Cue): () => void {
  cues.add(cue)
  if (last >= cue.at) cue.enter()
  return () => {
    cues.delete(cue)
  }
}

/** Called by ScrollDirector on every scroll update. Fires crossed cues in scroll order. */
export function updateCues(screen: number): void {
  if (screen === last) return
  const forward = screen > last
  hits.length = 0
  for (const c of cues) {
    if (forward ? last < c.at && screen >= c.at : screen < c.at && last >= c.at) hits.push(c)
  }
  hits.sort((a, b) => (forward ? a.at - b.at : b.at - a.at))
  last = screen
  for (const c of hits) (forward ? c.enter : c.leaveBack)()
}

/** Test helper. */
export function resetCues(screen = 0): void {
  cues.clear()
  last = screen
}
