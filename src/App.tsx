import { Stage } from './scene/Stage'
import { ScrollDirector } from './story/ScrollDirector'
import { ScrollTrack } from './scroll/ScrollTrack'
import { Hud } from './hud/Hud'
import { Loader } from './hud/Loader'
import { FpsMeter } from './debug/FpsMeter'
import { content } from './content'

const DEBUG = new URLSearchParams(window.location.search).has('debug')

export function App() {
  return (
    <>
      <h1 className="sr-only">{content.title}</h1>
      <Stage />
      <ScrollDirector />
      <ScrollTrack />
      <Hud />
      <Loader />
      {DEBUG && <FpsMeter />}
    </>
  )
}
