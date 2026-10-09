import { useLayoutEffect, type RefObject } from 'react'
import { WIPE } from '../../config/birth'
import { linkShown, wipeStyle, type WipeMode, type WipeView } from './wipe'

/**
 * The current screen-space wipe, written every frame by WipeLine (in the canvas loop, after the camera) and read by
 * the DOM layers below. Mutable: never React state.
 */
export const wipeView: WipeView = {
  phase: 'idle',
  line: { x: 0, y: 0, angle: Math.PI / 2, half: 0 },
  aspect: 1,
  width: 1,
  height: 1,
  wipeX: WIPE.leftX,
}

interface Target {
  el: HTMLElement
  mode: WipeMode
  clip: string | null
  visibility: string | null
  links: HTMLElement[]
  linkOn: (boolean | null)[]
}

const targets = new Set<Target>()

const rights: number[] = []

function write(t: Target): void {
  // Links stay hidden (not focusable, not clickable) until the line has passed them. Their rects are read only during
  // the sweep and before any style write of this frame's pass (clip-path and visibility never change layout).
  const sweep = t.mode === 'reveal' && wipeView.phase === 'sweep'
  rights.length = 0
  if (sweep) for (const a of t.links) rights.push(a.getBoundingClientRect().right)

  const s = wipeStyle(t.mode, wipeView)
  if (s.clip !== t.clip) {
    t.clip = s.clip
    t.el.style.clipPath = s.clip
  }
  if (s.visibility !== t.visibility) {
    t.visibility = s.visibility
    t.el.style.visibility = s.visibility
  }
  if (t.mode !== 'reveal') return
  for (let i = 0; i < t.links.length; i++) {
    const on = linkShown(wipeView, sweep ? rights[i] : 0)
    if (on === t.linkOn[i]) continue
    t.linkOn[i] = on
    // '' inherits the block's own visibility (hidden before the sweep); never 'visible', which would override it.
    t.links[i].style.visibility = on ? '' : 'hidden'
  }
}

/** Writes every registered layer's clip from `wipeView`, only where a value changed. Called once per canvas frame. */
export function applyWipeClips(): void {
  for (const t of targets) write(t)
}

/** Registers a DOM layer (it should cover the viewport: clips are in viewport px) and applies its current state. */
export function registerWipeLayer(el: HTMLElement, mode: WipeMode): () => void {
  const links = mode === 'reveal' ? Array.from(el.querySelectorAll<HTMLElement>('a')) : []
  const t: Target = { el, mode, clip: null, visibility: null, links, linkOn: links.map(() => null) }
  targets.add(t)
  write(t)
  return () => {
    targets.delete(t)
    el.style.clipPath = ''
    el.style.visibility = ''
    for (const a of links) a.style.visibility = ''
  }
}

/** Clips the referenced layer with the finale wipe (see wipeStyle): 'erase' the old copy, 'reveal' the final block. */
export function useWipeClip(ref: RefObject<HTMLElement | null>, mode: WipeMode): void {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    return registerWipeLayer(el, mode)
  }, [ref, mode])
}
