// Dev harness, imported only with `?debug`. Exposes window.__app for playwright checks
// and draws a small stats overlay.
const errors = [];

// Installed at import time so errors during boot are captured too.
window.addEventListener('error', (e) => {
  errors.push({ type: 'error', message: e.message, source: e.filename, line: e.lineno });
});
window.addEventListener('unhandledrejection', (e) => {
  errors.push({ type: 'rejection', message: String((e.reason && e.reason.stack) || e.reason) });
});
const origError = console.error;
console.error = (...args) => {
  errors.push({ type: 'console', message: args.map(String).join(' ') });
  origError.apply(console, args);
};

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

export function initDebug(ctx, { ready }) {
  const { renderer, loop, quality } = ctx;
  let frames = []; // ms of rendered frames

  loop.onFrame((ms) => {
    if (ms > 250) return; // idle gaps are not frames
    frames.push(ms);
    if (frames.length > 20000) frames.shift();
  });

  function stats(list) {
    if (!list.length) return { frames: 0, avgFps: 0, p10Fps: 0, p95Ms: 0 };
    const sorted = [...list].sort((a, b) => a - b);
    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    return {
      frames: list.length,
      avgFps: +(1000 / avg).toFixed(1),
      p10Fps: +(1000 / percentile(sorted, 0.9)).toFixed(1),
      p95Ms: +percentile(sorted, 0.95).toFixed(2),
    };
  }

  function frameStats({ reset = false } = {}) {
    const out = stats(frames);
    if (reset) frames = [];
    return out;
  }

  // GPU+CPU cost per frame. Default: render n frames back to back and wait once at the end with a
  // 1px readback (steady-state throughput, like a GPU-bound loop). { sync: true } waits after
  // every frame instead (includes pipeline latency).
  function bench(n = 120, { post, sync = false } = {}) {
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    const fx = ctx.postfx;
    const prev = fx ? fx.enabled : false;
    if (fx && post !== undefined) fx.enabled = post;
    const read = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const run = (count) => {
      for (let i = 0; i < count; i++) {
        loop.renderNow();
        if (sync) read();
      }
      if (!sync) read();
    };
    run(15);
    const t0 = performance.now();
    run(n);
    const avgMs = (performance.now() - t0) / n;
    if (fx) fx.enabled = prev;
    loop.markDirty();
    return { n, sync, post: post === undefined ? prev : post, avgMs: +avgMs.toFixed(3) };
  }

  const app = {
    ctx,
    errors,
    whenReady: () => ready,
    gpu: () => quality.tier.gpu,
    quality: () => ({
      tier: quality.tier.name,
      dpr: quality.getDpr(),
      postLevel: quality.adaptive.level,
      events: quality.adaptive.events,
    }),
    state: () => ({
      stage: null,
      t: 0,
      scrollY: window.scrollY,
      heroScreen: ctx.rig.followTarget ? ctx.rig.project(ctx.rig.followTarget) : null,
      finalActive: false,
      spin: null,
    }),
    frameStats,
    bench,
    seek: () => Promise.resolve(), // stub until the timeline exists
  };
  window.__app = app;

  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;top:8px;right:8px;z-index:900;padding:6px 8px;background:rgba(0,0,0,.65);' +
    'color:#9f9;font:11px/1.35 ui-monospace,Consolas,monospace;white-space:pre;pointer-events:none;border-radius:4px';
  document.body.appendChild(el);
  setInterval(() => {
    const s = stats(frames.slice(-120));
    const info = renderer.info.render;
    const post = ctx.postfx;
    const calls = post && post.sceneStats ? post.sceneStats.calls : info.calls;
    const tris = post && post.sceneStats ? post.sceneStats.triangles : info.triangles;
    el.textContent =
      `fps ${s.avgFps}  p10 ${s.p10Fps}  p95 ${s.p95Ms} ms\n` +
      `tier ${quality.tier.name}  dpr ${quality.getDpr()}  post ${quality.adaptive.level}\n` +
      `calls ${calls}  tris ${tris}\n` +
      `${quality.tier.gpu}`;
  }, 500);

  return app;
}
