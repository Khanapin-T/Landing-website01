type ScrollTo = (screen: number) => void

/** Fallback until ScrollDirector installs the Lenis-based implementation. */
let impl: ScrollTo = (screen) => window.scrollTo({ top: screen * window.innerHeight, behavior: 'smooth' })

export function setScrollToScreen(fn: ScrollTo): void {
  impl = fn
}

export function scrollToScreen(screen: number): void {
  impl(screen)
}
