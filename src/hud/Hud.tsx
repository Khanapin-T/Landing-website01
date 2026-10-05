import { ActScale } from './ActScale'

/** DOM overlay above the canvas. Act sessions add their HUD pieces here. */
export function Hud() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <ActScale />
    </div>
  )
}
