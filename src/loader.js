// Loader overlay (markup and CSS are inline in index.html so it paints before any script).
// The text comes from content.js, the single source of copy.
import { LOADER } from './content.js';

let el = null;
let bar = null;
let shown = 0;

export const loader = {
  init() {
    el = document.getElementById('loader');
    if (!el) return;
    bar = el.querySelector('.loader-bar i');
    const text = el.querySelector('.loader-text');
    text.textContent = LOADER.text;
    text.classList.add('is-set');
  },

  // Progress 0..1; it never goes backwards.
  set(p) {
    shown = Math.max(shown, Math.min(1, p));
    if (bar) bar.style.transform = `scaleX(${shown})`;
  },

  // Fades the overlay out (instantly with prefers-reduced-motion) and resolves when it is gone.
  hide() {
    return new Promise((resolve) => {
      if (!el) return resolve();
      const node = el;
      const done = () => {
        node.remove();
        resolve();
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
      node.classList.add('is-done');
      node.addEventListener('transitionend', (e) => e.target === node && e.propertyName === 'opacity' && done());
      setTimeout(done, 1200); // fallback if the transition never fires (hidden tab)
    });
  },
};
