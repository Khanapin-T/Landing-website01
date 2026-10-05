// Desktop-only gate. No viewport-width check: any desktop window size is allowed.
export function isDesktop() {
  const ua = navigator.userAgent || '';
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return false;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return false;
  // iPad in desktop mode reports a Mac UA but has a touch screen.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return false;
  return true;
}
