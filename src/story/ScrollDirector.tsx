import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css' // .lenis-stopped blocks keyboard/native scroll under the loader, not just the wheel
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TOTAL_SCREENS, actAt, actLocalProgress, temperatureAt } from '../config/acts'
import { getAppState, subscribeApp } from './appState'
import { master } from './master'
import { setScrollToScreen } from './scrollControl'
import { setAct, story } from './store'

gsap.registerPlugin(ScrollTrigger)

function apply(screen: number): void {
  const win = actAt(screen)
  story.screen = Math.min(Math.max(screen, 0), TOTAL_SCREENS)
  story.actProgress = actLocalProgress(screen, win)
  story.temperature = temperatureAt(screen)
  setAct(win.id)
  master.time(story.screen)
}

/** Lenis smooth scroll + one ScrollTrigger over #track. Writes story values; never sets React state. */
export function ScrollDirector() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // autoRaf off: Lenis is driven by the GSAP ticker below (one clock for scroll and timeline).
    const lenis = new Lenis({ autoRaf: false, lerp: reduce ? 1 : 0.1, smoothWheel: !reduce })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // No scrolling under the loader.
    const syncLock = () => (getAppState().phase === 'ready' ? lenis.start() : lenis.stop())
    syncLock()
    const offApp = subscribeApp(syncLock)

    const st = ScrollTrigger.create({
      trigger: '#track',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => apply(self.progress * TOTAL_SCREENS),
    })
    apply(st.progress * TOTAL_SCREENS)

    // The track is sized in vh: after a resize, F11 or zoom, keep the same story position, not the same pixels.
    let savedScreen = 0
    const onRefreshInit = () => {
      savedScreen = story.screen
    }
    const onRefresh = () => {
      lenis.scrollTo(savedScreen * window.innerHeight, { immediate: true, force: true })
    }
    ScrollTrigger.addEventListener('refreshInit', onRefreshInit)
    ScrollTrigger.addEventListener('refresh', onRefresh)

    setScrollToScreen((screen) => lenis.scrollTo(screen * window.innerHeight, { duration: 1.4, immediate: reduce }))

    return () => {
      offApp()
      ScrollTrigger.removeEventListener('refreshInit', onRefreshInit)
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      st.kill()
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  return null
}
