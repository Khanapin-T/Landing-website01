export interface DeviceEnv {
  /** matches '(hover: none) and (pointer: coarse)': the primary pointer is a finger. */
  coarseNoHover: boolean
  userAgent: string
  maxTouchPoints: number
}

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i

/** True for phones and tablets. Touchscreen laptops keep a fine primary pointer and pass. */
export function isTouchPrimary(env: DeviceEnv): boolean {
  if (env.coarseNoHover) return true
  if (MOBILE_UA.test(env.userAgent)) return true
  // iPadOS Safari reports a desktop Mac user agent; real Macs have no touch points.
  if (/Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1) return true
  return false
}

export function readDeviceEnv(): DeviceEnv {
  return {
    coarseNoHover: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  }
}
