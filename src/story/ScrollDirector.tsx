import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css' // .lenis-stopped blocks keyboard/native scroll under the loader, not just the wheel
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TOTAL_SCREENS, actAt, actLocalProgress, temperatureAt } from '../config/acts'
import { getAppState, subscribeApp } from './appState'
import { type AutoplayStep, getAutoplay, setAutoplay, stepAutoplay } from './autoplay'
import { master } from './master'
import { setScrollToScreen } from './scrollControl'
import { updateCues } from './cues'
import { setAct, story } from './store'

gsap.registerPlugin(ScrollTrigger)

/** Keys that scroll the page: pressing one while autoplay runs takes the scroll back. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Space', 'Escape'])

function apply(screen: number): void {
  const win = actAt(screen)
  story.screen = Math.min(Math.max(screen, 0), TOTAL_SCREENS)
  story.actProgress = actLocalProgress(screen, win)
  story.temperature = temperatureAt(screen)
  setAct(win.id)
  master.time(story.screen)
  updateCues(story.screen)
}

/** Lenis smooth scroll + one ScrollTrigger over #track. Writes story values; never sets React state. */
export function ScrollDirector() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // autoRaf off: Lenis is driven by the GSAP ticker below (one clock for scroll and timeline).
    const lenis = new Lenis({ autoRaf: false, lerp: reduce ? 1 : 0.1, smoothWheel: !reduce })
    lenis.on('scroll', ScrollTrigger.update)
    // Autoplay: the same clock moves the position, so scenes, copy and cues run exactly as under a hand scroll.
    let auto: AutoplayStep | null = null
    let lastTime = 0
    const tick = (time: number) => {
      if (getAutoplay()) {
        if (!auto) {
          // Start from here; from the very end it replays from the top.
          auto = { screen: story.screen >= TOTAL_SCREENS - 0.001 ? 0 : story.screen, rate: 0 }
          lastTime = time
        }
        const next = stepAutoplay(auto, time - lastTime)
        lastTime = time
        auto = next
        lenis.scrollTo(next.screen * window.innerHeight, { immediate: true, force: true })
        if (next.done) setAutoplay(false)
      } else {
        auto = null
      }
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // Any manual input hands the scroll back. The autoplay button is exempt for pointer input, and for Space, which
    // activates the focused button (focus stays on it after a click, so the other scroll keys must still pause).
    const onButton = (e: Event) => e.target instanceof Element && !!e.target.closest('[data-autoplay]')
    const manual = (e: Event) => {
      if (!onButton(e)) setAutoplay(false)
    }
    const scrollKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.code) && !(e.code === 'Space' && onButton(e))) setAutoplay(false)
    }
    window.addEventListener('wheel', manual, { passive: true })
    window.addEventListener('pointerdown', manual)
    window.addEventListener('keydown', scrollKey)

    // No scrolling under the loader.
    const syncLock = () => {
      const ready = getAppState().phase === 'ready'
      if (ready) lenis.start()
      else {
        lenis.stop()
        setAutoplay(false)
      }
    }
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
      setAutoplay(false)
      window.removeEventListener('wheel', manual)
      window.removeEventListener('pointerdown', manual)
      window.removeEventListener('keydown', scrollKey)
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
