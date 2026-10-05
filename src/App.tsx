import { Component, type ReactNode } from 'react'
import { Stage } from './scene/Stage'
import { setError } from './story/appState'
import { ScrollDirector } from './story/ScrollDirector'
import { ScrollTrack } from './scroll/ScrollTrack'
import { Hud } from './hud/Hud'
import { Loader } from './hud/Loader'
import { FpsMeter } from './debug/FpsMeter'
import { content } from './content'

const DEBUG = new URLSearchParams(window.location.search).has('debug')

/** Anything the canvas re-throws into the DOM tree ends in the loader's error state, never a blank page. */
class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    setError(String(error))
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function App() {
  return (
    <>
      <h1 className="sr-only">{content.title}</h1>
      <StageBoundary>
        <Stage />
      </StageBoundary>
      <ScrollDirector />
      <ScrollTrack />
      <Hud />
      <Loader />
      {DEBUG && <FpsMeter />}
    </>
  )
}
