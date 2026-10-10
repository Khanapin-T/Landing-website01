import { IntroTitle } from '../acts/intro/IntroTitle'
import { IdeaHud } from '../acts/idea/IdeaHud'
import { DimLabels } from '../acts/idea/DimLabels'
import { PrintHud } from '../acts/print/PrintHud'
import { MoldHud } from '../acts/mold/MoldHud'
import { FireHud } from '../acts/fire/FireHud'
import { GoldHud } from '../acts/gold/GoldHud'
import { WaterHud } from '../acts/water/WaterHud'
import { BirthHud } from '../acts/birth/BirthHud'
import { FinaleHud } from '../acts/birth/FinaleHud'

/** DOM overlay above the canvas. Acts mount their copy here; the scrim keeps the left copy column readable. */
export function Hud() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {/* data-scrim: the finale wipe (acts/birth/FinaleHud) pushes it out, so the page left of the line is pure black. */}
      <div data-scrim className="absolute inset-y-0 left-0 w-[55vw] bg-[linear-gradient(90deg,rgb(10_22_34/0.72),rgb(10_22_34/0.35)_55%,transparent)]" />
      <IntroTitle />
      <IdeaHud />
      <DimLabels />
      <PrintHud />
      <MoldHud />
      <FireHud />
      <GoldHud />
      <WaterHud />
      <BirthHud />
      <FinaleHud />
    </div>
  )
}
