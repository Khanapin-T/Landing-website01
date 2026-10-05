import { isDesktop } from './gate.js';

// The gate runs first; the app (WebGL, models) is only requested on desktop.
if (isDesktop()) {
  import('./main.js');
} else {
  document.documentElement.classList.add('is-gated');
  document.getElementById('gate').hidden = false;
}
