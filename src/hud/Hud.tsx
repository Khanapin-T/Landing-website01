import { ActScale } from './ActScale'
import { IntroTitle } from '../acts/intro/IntroTitle'
import { IdeaHud } from '../acts/idea/IdeaHud'
import { DimLabels } from '../acts/idea/DimLabels'
import { PrintHud } from '../acts/print/PrintHud'
import { MoldHud } from '../acts/mold/MoldHud'
import { FireHud } from '../acts/fire/FireHud'

/** DOM overlay above the canvas. Acts mount their copy here; the scrim keeps the left copy column readable. */
export function Hud() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <div className="absolute inset-y-0 left-0 w-[55vw] bg-[linear-gradient(90deg,rgb(10_22_34/0.72),rgb(10_22_34/0.35)_55%,transparent)]" />
      <IntroTitle />
      <IdeaHud />
      <DimLabels />
      <PrintHud />
      <MoldHud />
      <FireHud />
      <ActScale />
    </div>
  )
}
