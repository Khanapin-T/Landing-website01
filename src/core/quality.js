// Desktop only: three tiers, no mobile tier.
// post: blur resolution divisor (blur texture = screen / div), blur passes (H+V pairs),
// edge-blur / bloom / aberration toggles, MSAA samples of the post render target (0 = FXAA instead).
export const TIERS = {
  high: {
    name: 'high',
    dprMax: 1.5,
    particleScale: 1,
    post: { div: 4, iterations: 2, edgeBlur: true, bloom: true, aberration: true, samples: 0 },
  },
  medium: {
    name: 'medium',
    dprMax: 1.25,
    particleScale: 0.6,
    post: { div: 4, iterations: 1, edgeBlur: true, bloom: true, aberration: true, samples: 0 },
  },
  low: {
    name: 'low',
    dprMax: 1,
    particleScale: 0.35,
    post: { div: 8, iterations: 1, edgeBlur: true, bloom: true, aberration: true, samples: 0 },
  },
};

const SOFTWARE = /SwiftShader|llvmpipe|Software/i;

export function getGpuString(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
}

// `forced` comes from `?tier=`. Software renderers get the low tier.
export function detectTier(gl, forced) {
  const gpu = getGpuString(gl);
  const name = TIERS[forced] ? forced : SOFTWARE.test(gpu) ? 'low' : 'high';
  return { ...TIERS[name], gpu, forced: Boolean(TIERS[forced]) };
}

// Post quality ladder derived from the tier's starting params:
// fewer blur passes -> half-resolution blur -> no chromatic aberration.
export function postSteps(base) {
  const steps = [{ ...base }];
  const push = (patch) => steps.push({ ...steps[steps.length - 1], ...patch });
  if (base.iterations > 1) push({ iterations: 1 });
  if (base.div < 8) push({ div: 8 });
  if (base.aberration) push({ aberration: false });
  return steps;
}

// Rolling 2 s window over RENDERED frames (the loop only reports consecutive rendered ticks,
// so idle time between dirty frames is never counted). Needs >= 1.5 s and >= 5 samples to
// decide; ignores the first 3 s after start and frames longer than 250 ms (tab switches). When avg fps < 40: lower the post effect quality first, then the
// DPR in 0.25 steps (floor 0.75). 2 s between steps, never steps back up.
export function createAdaptive({ tier, getDpr, setDpr, setPost = null, log = true }) {
  const WINDOW = 2000;
  const WARMUP = 3000;
  const MIN_SPAN = 1500; // collected span needed before a decision
  const MIN_SAMPLES = 5;
  const STEP_GAP = 2000;
  const MIN_FPS = 40;
  const DPR_STEP = 0.25;
  const DPR_FLOOR = 0.75;
  const steps = setPost ? postSteps(tier.post) : [];
  const born = performance.now();
  const events = [];
  let level = 0;
  let samples = []; // { t, ms }
  let lastStep = born;

  function step(now, fps) {
    if (level < steps.length - 1) {
      level++;
      setPost(steps[level]);
      events.push({ at: Math.round(now - born), type: 'post', level, params: steps[level], fps: Math.round(fps * 10) / 10 });
    } else if (getDpr() - DPR_STEP >= DPR_FLOOR - 1e-6) {
      const dpr = Math.max(DPR_FLOOR, getDpr() - DPR_STEP);
      setDpr(dpr);
      events.push({ at: Math.round(now - born), type: 'dpr', dpr, fps: Math.round(fps * 10) / 10 });
    } else {
      return false;
    }
    if (log) console.info('[adaptive]', events[events.length - 1]);
    samples = [];
    lastStep = now;
    return true;
  }

  function frame(ms, now = performance.now()) {
    if (now - born < WARMUP || ms > 250) return;
    samples.push({ t: now, ms });
    while (samples.length && now - samples[0].t > WINDOW) samples.shift();
    if (now - samples[0].t < MIN_SPAN || samples.length < MIN_SAMPLES || now - lastStep < STEP_GAP) return;
    let sum = 0;
    for (const s of samples) sum += s.ms;
    const fps = 1000 / (sum / samples.length);
    if (fps < MIN_FPS) step(now, fps);
  }

  return { frame, events, get level() { return level; }, get steps() { return steps; } };
}
