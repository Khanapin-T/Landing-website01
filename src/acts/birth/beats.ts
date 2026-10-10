import { TOTAL_SCREENS } from '../../config/acts'

/** Act 7 choreography in absolute screens (birth 14.0..17.0). Tune by eye. */
export const BIRTH_BEATS = {
  windowFrom: 14.0,
  windowTo: TOTAL_SCREENS,
  copyIn: 14.1,
  /**
   * The act copy (and the acid timer) is gone when the sweep starts: by then the line has erased it (clip), the cue
   * only makes sure nothing of it leaks afterwards. The final block has no cue: the sweep reveals it.
   */
  copyOut: 16.5,
  /** Camera to the tree + jar view while the jar rises in from below. */
  camFrom: 14.0,
  camTo: 14.3,
  jarFrom: 14.0,
  jarTo: 14.3,
  /** The rings come off one by one (CUT_ORDER): ring k falls from cutFrom + k * cutStep for fallLen. */
  cutFrom: 14.3,
  cutStep: 0.16,
  fallLen: 0.13,
  /** The empty tree goes up out of the frame. */
  treeUpFrom: 14.95,
  treeUpTo: 15.15,
  /** Ten minutes in the acid. */
  restFrom: 15.15,
  restTo: 15.65,
  /** The top ring comes out to the centre, the jar goes down, the camera closes in. */
  outFrom: 15.65,
  outTo: 15.95,
  /** The neon line passes right to left while the ring turns right; then the whole ring is polished. */
  polishFrom: 15.95,
  polishTo: 16.35,
  /** The line goes on to the left edge of the page, turning upright and growing to the full height (erases the copy). */
  edgeFrom: 16.35,
  edgeTo: 16.5,
  /** Then straight back across the page, left to right: black and the final block behind it. */
  sweepFrom: 16.5,
  sweepTo: 16.78,
  /** Final: tilt, slow spin, the final camera, the lights and the brighter gold; done with the sweep. */
  finalFrom: 16.42,
  finalTo: 16.78,
  /** The reflection fades in only once the sweep is done (the whole page black behind it); then a short hold. */
  reflectFrom: 16.78,
  reflectTo: 16.92,
  /** Step list cues (start screens). */
  steps: { cut: 14.3, acid: 15.15, polish: 15.95 },
} as const
