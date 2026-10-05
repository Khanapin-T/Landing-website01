import { TOTAL_SCREENS } from '../config/acts'

/** Native scroll length: TOTAL_SCREENS screens of travel plus one viewport. */
export function ScrollTrack() {
  return <div id="track" aria-hidden="true" style={{ height: `${(TOTAL_SCREENS + 1) * 100}vh` }} />
}
