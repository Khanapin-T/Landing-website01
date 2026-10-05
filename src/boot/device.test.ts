import { describe, expect, it } from 'vitest'
import { isTouchPrimary } from './device'

const WIN_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36'
const ANDROID_TABLET = 'Mozilla/5.0 (Linux; Android 16; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'

describe('isTouchPrimary', () => {
  it('lets a desktop browser through', () => {
    expect(isTouchPrimary({ coarseNoHover: false, userAgent: WIN_CHROME, maxTouchPoints: 0 })).toBe(false)
  })

  it('lets a Windows touchscreen laptop through (fine primary pointer)', () => {
    expect(isTouchPrimary({ coarseNoHover: false, userAgent: WIN_CHROME, maxTouchPoints: 10 })).toBe(false)
  })

  it('lets a desktop Mac through', () => {
    expect(isTouchPrimary({ coarseNoHover: false, userAgent: MAC_SAFARI, maxTouchPoints: 0 })).toBe(false)
  })

  it('blocks a coarse, hover-less primary pointer', () => {
    expect(isTouchPrimary({ coarseNoHover: true, userAgent: WIN_CHROME, maxTouchPoints: 5 })).toBe(true)
  })

  it('blocks phones by user agent', () => {
    expect(isTouchPrimary({ coarseNoHover: false, userAgent: IPHONE, maxTouchPoints: 5 })).toBe(true)
    expect(isTouchPrimary({ coarseNoHover: false, userAgent: ANDROID, maxTouchPoints: 5 })).toBe(true)
  })

  it('blocks Android tablets (Android UA without "Mobile")', () => {
    expect(isTouchPrimary({ coarseNoHover: false, userAgent: ANDROID_TABLET, maxTouchPoints: 10 })).toBe(true)
  })

  it('blocks iPadOS, which reports a Mac user agent', () => {
    expect(isTouchPrimary({ coarseNoHover: false, userAgent: MAC_SAFARI, maxTouchPoints: 5 })).toBe(true)
  })
})
