import { useSyncExternalStore } from 'react'

export type Phase = 'loading' | 'ready' | 'error'

export interface AppState {
  phase: Phase
  error: string | null
}

const INITIAL: AppState = { phase: 'loading', error: null }
let state: AppState = INITIAL
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

export function getAppState(): AppState {
  return state
}

/** loading -> ready only. A late ready never hides an error. */
export function setReady(): void {
  if (state.phase !== 'loading') return
  state = { phase: 'ready', error: null }
  emit()
}

/** Any phase -> error (first error wins). */
export function setError(message: string): void {
  if (state.phase === 'error') return
  state = { phase: 'error', error: message }
  emit()
}

export function subscribeApp(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribeApp, getAppState)
}

/** Test helper. */
export function resetAppState(): void {
  state = INITIAL
  listeners.clear()
}
