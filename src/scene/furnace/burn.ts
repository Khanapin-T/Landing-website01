import * as THREE from 'three'
import { BURN } from '../../config/fire'

/**
 * The burnout front, shared by every material that burns (the ring and the wax). Tree.tsx writes uBurnY once per frame
 * from story.flask.burn; the materials hold these objects by reference. BURN.off = nothing burns.
 */
export const burnUniforms = {
  uBurnY: { value: BURN.off as number },
  /** HDR orange: crosses the bloom threshold. */
  uBurnColor: { value: new THREE.Color(3.2, 1.15, 0.28) },
}

export const BURN_PARS = ['uniform float uBurnY;', 'uniform vec3 uBurnColor;', `#define BURN_BAND ${BURN.band.toFixed(4)}`].join('\n')

/** Fragment statement: everything above the front is gone. `worldY` = the material's world-Y varying. */
export const burnDiscard = (worldY: string): string => `if (${worldY} > uBurnY) discard;`

/** Fragment statement (runs before opaque_fragment): a glowing band just under the front. */
export const burnGlow = (worldY: string): string =>
  `{ float burnBand = 1.0 - smoothstep(0.0, BURN_BAND, uBurnY - ${worldY}); outgoingLight += uBurnColor * burnBand * burnBand; }`
