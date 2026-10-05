import gsap from 'gsap';

// gsap.ticker drives everything. Hooks run every tick (they may call markDirty());
// the scene is rendered only when dirty. `?slow=N` adds N ms of busy-wait per rendered
// frame (and renders every tick) to test the adaptive quality; `?live` renders every tick.
export function createLoop({ render, params = new URLSearchParams(location.search) }) {
  let hooks = []; // replaced (never mutated) on removal so a hook can remove itself mid-tick
  const frameListeners = [];
  const slow = Number(params.get('slow')) || 0;
  let continuous = slow > 0 || params.has('live');
  let dirty = true;
  let lastStart = 0;
  let prevRendered = false; // did the immediately preceding tick render?

  function tick(time, deltaMs) {
    if (document.hidden) {
      prevRendered = false;
      return;
    }
    const dt = Math.min(deltaMs, 100) / 1000;
    const list = hooks;
    for (let i = 0; i < list.length; i++) list[i](dt, time);
    if (!dirty && !continuous) {
      prevRendered = false;
      return;
    }
    dirty = false;

    const start = performance.now();
    render();
    if (slow) while (performance.now() - start < slow);
    // Frame time is reported only between consecutive rendered ticks: an interval after a
    // skipped (idle) tick is not a frame cost, so start-stop scrolling never looks like low fps.
    if (prevRendered && lastStart) {
      const ms = start - lastStart;
      for (let i = 0; i < frameListeners.length; i++) frameListeners[i](ms, start);
    }
    lastStart = start;
    prevRendered = true;
  }

  document.addEventListener('visibilitychange', () => {
    lastStart = 0;
    prevRendered = false;
    dirty = true;
  });
  gsap.ticker.add(tick);

  return {
    markDirty: () => {
      dirty = true;
    },
    add: (fn) => {
      hooks = [...hooks, fn];
      return () => {
        hooks = hooks.filter((h) => h !== fn);
      };
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
