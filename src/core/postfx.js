import {
  WebGLRenderTarget,
  HalfFloatType,
  UnsignedInt101111Type,
  RGBFormat,
  LinearFilter,
  ShaderMaterial,
  Mesh,
  BufferGeometry,
  Float32BufferAttribute,
  OrthographicCamera,
  Scene,
  Vector2,
} from 'three';

// One post pass for every scene:
//   scene -> HDR render target -> box downsample to 1/div -> separable 9-tap blur (5 bilinear
//   fetches per pass) -> ONE full-res composite that adds FXAA, bloom, edge-vignette blur (both
//   reuse the same unthresholded blur texture), subtle chromatic aberration and the
//   scene-transition effect, then applies tone mapping + sRGB itself.
// The HDR target is R11G11B10F (32 bit, falls back to RGBA16F) and is NOT multisampled: on the
// Radeon 740M the 4x MSAA resolve cost ~3 ms per frame at 1080p, so edges are smoothed by FXAA
// in the composite instead (tier.post.samples can still enable MSAA).

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Each output texel averages a (2N x 2N) block of source pixels with N x N bilinear taps.
// Values are clamped so a tiny hot highlight cannot flood the blur (fireflies).
const DOWN_FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uTexel;
uniform int uN;
varying vec2 vUv;
void main() {
  vec3 acc = vec3(0.0);
  float mid = (float(uN) - 1.0) * 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= uN) break;
    for (int j = 0; j < 8; j++) {
      if (j >= uN) break;
      vec2 o = (vec2(float(i), float(j)) - mid) * 2.0 * uTexel;
      acc += min(texture2D(tMap, vUv + o).rgb, vec3(24.0));
    }
  }
  gl_FragColor = vec4(acc / float(uN * uN), 1.0);
}`;

// 9-tap Gaussian as 5 bilinear fetches.
const BLUR_FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv).rgb * 0.2270270270;
  c += (texture2D(tMap, vUv + uDir * 1.3846153846).rgb + texture2D(tMap, vUv - uDir * 1.3846153846).rgb) * 0.3162162162;
  c += (texture2D(tMap, vUv + uDir * 3.2307692308).rgb + texture2D(tMap, vUv - uDir * 3.2307692308).rgb) * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tScene, tBlur;
uniform float uTime, uTrans, uFxaa;
uniform vec2 uTexel;
uniform float uBloom, uBloomThr, uBloomKnee, uBloomOn;
uniform float uEdge, uEdgeIn, uEdgeOut, uEdgeOn;
uniform float uCA, uCAOn;
uniform float uFlash, uVeil, uTransCA, uTransBlur, uGlitch, uTransNoise;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 sceneCA(vec2 uv, vec2 off) {
  return vec3(texture2D(tScene, uv + off).r, texture2D(tScene, uv).g, texture2D(tScene, uv - off).b);
}

float lum(vec3 c) {
  c = c / (1.0 + c); // perceptual-ish luma for HDR input
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// FXAA (classic lite variant): early-out on flat areas, blur along the edge direction otherwise.
vec3 fxaa(vec2 uv) {
  vec3 rgbM = texture2D(tScene, uv).rgb;
  vec3 rgbNW = texture2D(tScene, uv + vec2(-1.0, -1.0) * uTexel).rgb;
  vec3 rgbNE = texture2D(tScene, uv + vec2(1.0, -1.0) * uTexel).rgb;
  vec3 rgbSW = texture2D(tScene, uv + vec2(-1.0, 1.0) * uTexel).rgb;
  vec3 rgbSE = texture2D(tScene, uv + vec2(1.0, 1.0) * uTexel).rgb;
  float lM = lum(rgbM), lNW = lum(rgbNW), lNE = lum(rgbNE), lSW = lum(rgbSW), lSE = lum(rgbSE);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  if (lMax - lMin < max(0.03, lMax * 0.1)) return rgbM;
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
  dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + reduce), -8.0, 8.0) * uTexel;
  vec3 a = 0.5 * (texture2D(tScene, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tScene, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tScene, uv + dir * -0.5).rgb + texture2D(tScene, uv + dir * 0.5).rgb);
  float lB = lum(b);
  return (lB < lMin || lB > lMax) ? a : b;
}

void main() {
  vec2 uv = vUv;
  vec2 c = uv - 0.5;
  float r = length(c) * 1.41421356;      // 0 in the centre, 1 in the corners
  float a = uTrans;                      // sin(pi * t), 0 at both ends
  float peak = smoothstep(0.55, 1.0, a);

  // Glitch: horizontal band displacement near the peak of a transition.
  if (peak > 0.0) {
    float tick = floor(uTime * 18.0);
    float band = floor(uv.y * 30.0 + tick * 3.17);
    float on = step(0.7, hash(vec2(band, tick)));
    uv.x += (hash(vec2(band, 7.0)) - 0.5) * uGlitch * peak * on;
  }

  // Chromatic aberration grows towards the edges (and during transitions).
  vec2 off = c * r * uCA * uCAOn * (1.0 + a * uTransCA);

  vec3 col;
  if (a > 0.0) {
    // Radial blur towards the centre.
    float s = a * uTransBlur;
    col = vec3(0.0);
    float jitter = hash(gl_FragCoord.xy + 3.0); // breaks up the ghosting between taps
    for (int i = 0; i < 8; i++) col += sceneCA(uv - c * s * ((float(i) + jitter) / 8.0), off);
    col /= 8.0;
  } else if (uFxaa > 0.5) {
    col = fxaa(uv);
    if (dot(off, off) > 0.0) {
      // Aberration as a per-channel shift on top of the smoothed colour.
      vec3 m = texture2D(tScene, uv).rgb;
      col.r += texture2D(tScene, uv + off).r - m.r;
      col.b += texture2D(tScene, uv - off).b - m.b;
    }
  } else {
    col = sceneCA(uv, off);
  }

  vec3 blur = texture2D(tBlur, uv).rgb;

  // Edge-vignette blur: sharp centre, blurred borders.
  col = mix(col, blur, smoothstep(uEdgeIn, uEdgeOut, r) * uEdge * uEdgeOn);

  // Bloom from the same blur texture: threshold + soft knee on the blurred light.
  float l = max(blur.r, max(blur.g, blur.b));
  float soft = clamp(l - uBloomThr + uBloomKnee, 0.0, 2.0 * uBloomKnee);
  soft = soft * soft / (4.0 * uBloomKnee + 1e-4);
  float contrib = max(soft, l - uBloomThr) / max(l, 1e-4);
  col += blur * contrib * uBloom * uBloomOn;

  // Transition: bloom flash, warm veil, noise.
  col += blur * a * uFlash;
  col = mix(col, vec3(1.0, 0.92, 0.8) * 1.2, a * a * a * uVeil);
  col += (hash(gl_FragCoord.xy + floor(uTime * 24.0)) - 0.5) * uTransNoise * peak;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // 8-bit output dither against banding in dark gradients.
  gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0);
}`;

function makeTarget(hdrR11, samples = 0, depth = false) {
  return new WebGLRenderTarget(1, 1, {
    format: hdrR11 ? RGBFormat : undefined,
    type: hdrR11 ? UnsignedInt101111Type : HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: depth,
    stencilBuffer: false,
    resolveDepthBuffer: false, // only the colour is read; skipping the depth resolve saves bandwidth
    resolveStencilBuffer: false,
    generateMipmaps: false,
    samples,
  });
}

export function createPostFx(renderer, tier, { onDirty = () => {} } = {}) {
  let quality = { div: 4, iterations: 2, edgeBlur: true, bloom: true, aberration: true, ...tier.post };
  const samples = tier.post.samples ?? 0;
  const hasFloatRT = renderer.extensions.has('EXT_color_buffer_float');
  const hasHalfRT = hasFloatRT || renderer.extensions.has('EXT_color_buffer_half_float');
  // Debug only: ?forceRt=rgba16f fails the R11G11B10F target, ?forceRt=none fails every target.
  const forceRt = new URLSearchParams(location.search).get('forceRt');

  let r11 = hasFloatRT;
  let sceneRT;
  let blurA;
  let blurB;
  const createTargets = () => {
    sceneRT = makeTarget(r11, samples, true);
    blurA = makeTarget(r11);
    blurB = makeTarget(r11);
  };
  createTargets();

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const quad = new Mesh(geometry);
  quad.frustumCulled = false;
  const quadScene = new Scene();
  quadScene.add(quad);
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const pass = (fragmentShader, uniforms) =>
    new ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false });

  const downMat = pass(DOWN_FRAG, { tMap: { value: null }, uTexel: { value: new Vector2() }, uN: { value: 2 } });
  const blurMat = pass(BLUR_FRAG, { tMap: { value: null }, uDir: { value: new Vector2() } });

  // All strengths are uniforms; the defaults are deliberately soft.
  const uniforms = {
    tScene: { value: sceneRT.texture },
    tBlur: { value: blurA.texture },
    uTime: { value: 0 },
    uFxaa: { value: samples > 0 ? 0 : 1 },
    uTexel: { value: new Vector2() },
    uTrans: { value: 0 },
    uBloom: { value: 0.3 },
    uBloomThr: { value: 0.8 },
    uBloomKnee: { value: 0.6 },
    uBloomOn: { value: 1 },
    uEdge: { value: 0.85 },
    uEdgeIn: { value: 0.4 },
    uEdgeOut: { value: 0.95 },
    uEdgeOn: { value: 1 },
    uCA: { value: 0.003 },
    uCAOn: { value: 1 },
    uFlash: { value: 1.2 },
    uVeil: { value: 0.5 },
    uTransCA: { value: 6 },
    uTransBlur: { value: 0.12 },
    uGlitch: { value: 0.05 },
    uTransNoise: { value: 0.1 },
  };
  const compositeMat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: COMPOSITE_FRAG,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: true, // tone mapping + sRGB are applied here, three skips them for render targets
  });

  const fx = {
    failed: false, // set when no usable render target exists
    enabled: true, // false renders the scene directly (A/B and frame-time comparison)
    blurSpread: 2.6, // blur radius scale (~22 px sigma at 1080p, div 4, 2 iterations)
    uniforms,
    sceneStats: { calls: 0, triangles: 0 },
  };

  let px = { w: 1, h: 1 };
  let blurSize = { w: 1, h: 1 };
  const needBlur = () => quality.bloom || quality.edgeBlur;

  function layout() {
    blurSize = { w: Math.max(1, Math.ceil(px.w / quality.div)), h: Math.max(1, Math.ceil(px.h / quality.div)) };
    blurA.setSize(blurSize.w, blurSize.h);
    blurB.setSize(blurSize.w, blurSize.h);
    downMat.uniforms.uTexel.value.set(1 / px.w, 1 / px.h);
    uniforms.uTexel.value.set(1 / px.w, 1 / px.h);
    downMat.uniforms.uN.value = quality.div / 2;
    uniforms.uBloomOn.value = quality.bloom ? 1 : 0;
    uniforms.uEdgeOn.value = quality.edgeBlur ? 1 : 0;
    uniforms.uCAOn.value = quality.aberration ? 1 : 0;
  }

  // (w, h) in CSS px, dpr = renderer pixel ratio (the drawing buffer is floor(w * dpr)).
  fx.setSize = (w, h, dpr) => {
    px = { w: Math.max(1, Math.floor(w * dpr)), h: Math.max(1, Math.floor(h * dpr)) };
    sceneRT.setSize(px.w, px.h);
    layout();
    verifyTargets();
    onDirty();
  };

  // Binds each target once and checks the framebuffer is complete (restores the previous target).
  function targetsComplete() {
    if (forceRt === 'none' || (forceRt === 'rgba16f' && r11)) return false;
    const gl = renderer.getContext();
    const prev = renderer.getRenderTarget();
    let ok = true;
    for (const rt of [sceneRT, blurA, blurB]) {
      renderer.setRenderTarget(rt);
      ok = ok && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }
    renderer.setRenderTarget(prev);
    return ok;
  }

  // R11G11B10F incomplete -> rebuild as RGBA16F; still incomplete (or no float render support)
  // -> disable the pass so the loop renders directly (same path as ?post=0).
  function verifyTargets() {
    if (!hasHalfRT) {
      fail('no float render target support');
      return;
    }
    if (targetsComplete()) return;
    if (r11) {
      console.warn('[postfx] R11G11B10F target incomplete, falling back to RGBA16F');
      [sceneRT, blurA, blurB].forEach((rt) => rt.dispose());
      r11 = false;
      createTargets();
      uniforms.tScene.value = sceneRT.texture;
      uniforms.tBlur.value = blurA.texture;
      sceneRT.setSize(px.w, px.h);
      layout();
      if (targetsComplete()) return;
    }
    fail('render targets incomplete');
  }

  function fail(reason) {
    if (fx.failed) return;
    console.warn(`[postfx] ${reason}, post pass disabled (direct render)`);
    fx.failed = true;
    fx.enabled = false;
  }

  // params: { div, iterations, edgeBlur, bloom, aberration } (partial is fine).
  fx.setQuality = (params) => {
    quality = { ...quality, ...params };
    layout();
    onDirty();
  };

  // t in [0,1]: a = sin(pi t) drives the effect; t = 0 and t = 1 are identical to no transition.
  fx.setTransition = (t) => {
    const a = Math.max(0, Math.sin(Math.PI * t));
    uniforms.uTrans.value = a < 1e-4 ? 0 : a;
    onDirty();
  };

  function draw(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCamera);
  }

  fx.render = (scene, camera) => {
    if (!fx.enabled) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    fx.sceneStats.calls = renderer.info.render.calls;
    fx.sceneStats.triangles = renderer.info.render.triangles;

    if (needBlur()) {
      // Keep the blur radius (in screen px) similar across divisors and iteration counts.
      const spread = fx.blurSpread * (4 / quality.div) * Math.sqrt(2 / quality.iterations);
      downMat.uniforms.tMap.value = sceneRT.texture;
      draw(downMat, blurA);
      for (let i = 0; i < quality.iterations; i++) {
        blurMat.uniforms.tMap.value = blurA.texture;
        blurMat.uniforms.uDir.value.set((spread / blurSize.w), 0);
        draw(blurMat, blurB);
        blurMat.uniforms.tMap.value = blurB.texture;
        blurMat.uniforms.uDir.value.set(0, spread / blurSize.h);
        draw(blurMat, blurA);
      }
    }

    uniforms.uTime.value = (performance.now() / 1000) % 1000;
    draw(compositeMat, null);
  };

  // Warm-up: compiles the shader programs of `scene` (for the post render target it is drawn into)
  // and of the post passes, so the first real frame does not stall. Resolves when all are ready.
  fx.compileAsync = (scene, camera) => {
    const prev = renderer.getRenderTarget();
    const jobs = [];
    // Programs depend on the active render target (tone mapping is applied by the composite),
    // so each compile call is issued with the target its material is drawn into.
    renderer.setRenderTarget(fx.enabled ? sceneRT : null);
    jobs.push(renderer.compileAsync(scene, camera));
    if (fx.enabled) {
      for (const [material, target] of [[downMat, blurA], [blurMat, blurB], [compositeMat, null]]) {
        quad.material = material;
        renderer.setRenderTarget(target);
        jobs.push(renderer.compileAsync(quadScene, quadCamera));
      }
    }
    renderer.setRenderTarget(prev);
    return Promise.all(jobs);
  };

  fx.dispose = () => {
    sceneRT.dispose();
    blurA.dispose();
    blurB.dispose();
    geometry.dispose();
    downMat.dispose();
    blurMat.dispose();
    compositeMat.dispose();
  };

  layout();
  return fx;
}
