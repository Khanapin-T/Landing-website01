import gsap from 'gsap';

// gsap.ticker drives everything. Hooks run every tick (they may call markDirty());
// the scene is rendered only when dirty. `?slow=N` adds N ms of busy-wait per rendered
// frame (and renders every tick) to test the adaptive quality; `?live` renders every tick.
export function createLoop({ render, params = new URLSearchParams(location.search) }) {
  const hooks = [];
  const frameListeners = [];
  const slow = Number(params.get('slow')) || 0;
  let continuous = slow > 0 || params.has('live');
  let dirty = true;
  let lastStart = 0;

  function tick(time, deltaMs) {
    if (document.hidden) return;
    const dt = Math.min(deltaMs, 100) / 1000;
    for (let i = 0; i < hooks.length; i++) hooks[i](dt, time);
    if (!dirty && !continuous) return;
    dirty = false;

    const start = performance.now();
    render();
    if (slow) while (performance.now() - start < slow);
    // Frame time = interval between rendered frames; long idle gaps are filtered by listeners.
    if (lastStart) {
      const ms = start - lastStart;
      for (let i = 0; i < frameListeners.length; i++) frameListeners[i](ms, start);
    }
    lastStart = start;
  }

  document.addEventListener('visibilitychange', () => {
    lastStart = 0;
    dirty = true;
  });
  gsap.ticker.add(tick);

  return {
    markDirty: () => {
      dirty = true;
    },
    add: (fn) => {
      hooks.push(fn);
      return () => hooks.splice(hooks.indexOf(fn), 1);
    },
    onFrame: (fn) => {
      frameListeners.push(fn);
    },
    renderNow: render,
    setContinuous: (v) => {
      continuous = v || slow > 0;
    },
    dispose: () => gsap.ticker.remove(tick),
  };
}
