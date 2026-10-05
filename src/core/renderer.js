import { WebGLRenderer, NeutralToneMapping } from 'three';

// MSAA comes from the post render target, so the canvas itself is not antialiased.
// `tier` is optional: the tier is detected from this renderer's GL context, so
// main.js applies the DPR with setDpr() once the tier is known.
export function createRenderer(canvas, tier = null) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = NeutralToneMapping;
  renderer.localClippingEnabled = true;
  // The loop resets the counters once per frame (post passes make several render calls).
  renderer.info.autoReset = false;

  let dpr = 1;
  const setDpr = (value) => {
    dpr = value;
    renderer.setPixelRatio(value);
  };
  const getDpr = () => dpr;
  if (tier) setDpr(Math.min(window.devicePixelRatio || 1, tier.dprMax));

  return { renderer, setDpr, getDpr };
}
