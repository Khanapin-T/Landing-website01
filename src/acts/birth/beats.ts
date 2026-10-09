import { TOTAL_SCREENS } from '../../config/acts'

/** Act 7 choreography in absolute screens (birth 14.0..17.0). Tune by eye. */
export const BIRTH_BEATS = {
  windowFrom: 14.0,
  windowTo: TOTAL_SCREENS,
  copyIn: 14.1,
  /** The act copy (and the acid timer) leaves for the final block. */
  copyOut: 16.5,
  finaleIn: 16.6,
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
  polishTo: 16.45,
  /** Final: tilt, reflection, slow spin, the final camera. */
  finalFrom: 16.5,
  finalTo: 16.75,
  /** Step list cues (start screens). */
  steps: { cut: 14.3, acid: 15.15, polish: 15.95 },
} as const
