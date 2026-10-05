import { useSyncExternalStore } from 'react'
import { QUALITY_STEPS, initialStep, type QualityStep } from './quality'

let index = typeof window === 'undefined' ? 0 : initialStep(window.devicePixelRatio)
const listeners = new Set<() => void>()

export function getQualityIndex(): number {
  return index
}

export function setQualityIndex(i: number): void {
  if (i === index) return
  index = i
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Re-renders only when the quality step changes (rare). */
export function useQuality(): QualityStep {
  return QUALITY_STEPS[useSyncExternalStore(subscribe, getQualityIndex)]
}
