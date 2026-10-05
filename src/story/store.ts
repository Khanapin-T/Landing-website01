import { useSyncExternalStore } from 'react'
import type { ActId } from '../config/acts'

/** Scroll-driven values. Mutated by ScrollDirector every scroll frame; read in useFrame. Never put this in React state. */
export interface Story {
  /** Scroll position in screens, 0..TOTAL_SCREENS. */
  screen: number
  act: ActId
  /** 0..1 progress inside the current act. */
  actProgress: number
  /** Frame temperature for the grade, 0..1. */
  temperature: number
}

export const story: Story = { screen: 0, act: 'intro', actProgress: 0, temperature: 0 }

const actListeners = new Set<() => void>()

/** Changes the current act and notifies subscribers only when it actually changes. */
export function setAct(id: ActId): void {
  if (story.act === id) return
  story.act = id
  actListeners.forEach((l) => l())
}

export function subscribeAct(listener: () => void): () => void {
  actListeners.add(listener)
  return () => actListeners.delete(listener)
}

/** Re-renders only on act changes (a few times per full scroll). */
export function useCurrentAct(): ActId {
  return useSyncExternalStore(subscribeAct, () => story.act)
}
