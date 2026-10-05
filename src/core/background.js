import { Mesh, BufferGeometry, Float32BufferAttribute, ShaderMaterial, Color } from 'three';

const VERT = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = vec4(position.xy, 0.999999, 1.0);
}`;

// Colors are linear. The tonemapping/colorspace chunks make the direct render match the
// post pass (they are no-ops inside a render target, where the post composite applies them).
const FRAG = /* glsl */ `
uniform vec3 uTop, uBot, uGlow;
uniform vec2 uGlowPos;
uniform float uGlowStrength, uGlowRadius, uAspect;
varying vec2 vP;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = vP * 0.5 + 0.5;
  vec3 col = mix(uBot, uTop, smoothstep(0.0, 1.0, uv.y));
  vec2 d = (uv - uGlowPos) * vec2(uAspect, 1.0);
  float g = exp(-dot(d, d) / (uGlowRadius * uGlowRadius));
  col += uGlow * g * uGlowStrength;
  col += (hash(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0) * 0.5;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const _c = new Color();

// Fullscreen gradient drawn inside WebGL so the post pass covers it.
// `params` is a plain object (linear colors) that timelines can tween; update() syncs it
// to the uniforms and reports whether anything changed.
export function createBackground(scene) {
  const top = new Color(0x1b2230);
  const bot = new Color(0x090c12);
  const glow = new Color(0x3a4f6e);
  const params = {
    topR: top.r, topG: top.g, topB: top.b,
    botR: bot.r, botG: bot.g, botB: bot.b,
    glowR: glow.r, glowG: glow.g, glowB: glow.b,
    glowX: 0.59, glowY: 0.5, glowStrength: 0.35, glowRadius: 0.6,
  };

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTop: { value: new Color() },
      uBot: { value: new Color() },
      uGlow: { value: new Color() },
      uGlowPos: { value: { x: 0, y: 0 } },
      uGlowStrength: { value: 0 },
      uGlowRadius: { value: 1 },
      uAspect: { value: 1 },
    },
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'background';
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  scene.add(mesh);

  const u = material.uniforms;
  const prev = {};
  let aspectDirty = true;

  function update() {
    let changed = aspectDirty;
    aspectDirty = false;
    for (const k in params) {
      if (prev[k] !== params[k]) {
        prev[k] = params[k];
        changed = true;
      }
    }
    if (!changed) return false;
    u.uTop.value.setRGB(params.topR, params.topG, params.topB);
    u.uBot.value.setRGB(params.botR, params.botG, params.botB);
    u.uGlow.value.setRGB(params.glowR, params.glowG, params.glowB);
    u.uGlowPos.value.x = params.glowX;
    u.uGlowPos.value.y = params.glowY;
    u.uGlowStrength.value = params.glowStrength;
    u.uGlowRadius.value = params.glowRadius;
    return true;
  }

  // Hex colors (sRGB, like CSS) -> linear params.
  function setColors(topColor, bottomColor, glowColor) {
    _c.set(topColor);
    params.topR = _c.r; params.topG = _c.g; params.topB = _c.b;
    _c.set(bottomColor);
    params.botR = _c.r; params.botG = _c.g; params.botB = _c.b;
    if (glowColor !== undefined) {
      _c.set(glowColor);
      params.glowR = _c.r; params.glowG = _c.g; params.glowB = _c.b;
    }
  }

  function resize(w, h) {
    u.uAspect.value = w / h;
    aspectDirty = true;
  }

  update();
  return { mesh, params, update, setColors, resize };
}
