import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAppState, resetAppState, setError, setReady, subscribeApp } from './appState'

describe('appState', () => {
  beforeEach(() => resetAppState())

  it('starts loading', () => {
    expect(getAppState()).toEqual({ phase: 'loading', error: null })
  })

  it('goes loading -> ready and notifies once', () => {
    const l = vi.fn()
    subscribeApp(l)
    setReady()
    setReady()
    expect(getAppState().phase).toBe('ready')
    expect(l).toHaveBeenCalledTimes(1)
  })

  it('allows ready -> error (context lost after start)', () => {
    setReady()
    setError('context-lost')
    expect(getAppState()).toEqual({ phase: 'error', error: 'context-lost' })
  })

  it('never lets a late ready hide an error', () => {
    setError('model failed')
    setReady()
    expect(getAppState()).toEqual({ phase: 'error', error: 'model failed' })
  })

  it('unsubscribes', () => {
    const l = vi.fn()
    const off = subscribeApp(l)
    off()
    setReady()
    expect(l).not.toHaveBeenCalled()
  })
})
