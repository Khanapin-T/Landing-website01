import { Effect, EffectAttribute } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float edgeBlur;   // 0 = off, 1 = full edge blur
uniform float aberration; // chromatic shift in pixels at the corners
uniform float haze;       // 0 = off, 1 = full furnace heat shimmer
uniform float time;       // seconds, already scaled

// Rising heat shimmer: a horizontal wobble that scrolls upward, strongest low in the frame. Reversed smoothstep
// edges are undefined in GLSL, hence 1.0 - smoothstep(...).
vec2 hazeOffset(vec2 uv) {
  float band = 1.0 - smoothstep(0.1, 1.0, uv.y);
  float w = sin(uv.y * 38.0 - time * 2.6 + sin(uv.x * 9.0 + time * 0.7) * 1.7);
  float w2 = sin(uv.y * 71.0 - time * 3.9 + uv.x * 13.0);
  return vec2((w * 0.7 + w2 * 0.3) * 0.0035 * haze * band, 0.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 uvh = uv + hazeOffset(uv);
  // haze is a uniform: this branch is uniform control flow.
  vec4 base = haze > 0.001 ? texture2D(inputBuffer, uvh) : inputColor;

  vec2 d = uv - 0.5;
  float r = length(d) * 1.41421356;       // 0 center, 1 corners
  float edge = smoothstep(0.35, 1.0, r);

  // Chromatic aberration grows toward the edges.
  vec2 ca = normalize(d + 1e-6) * aberration * edge * texelSize;
  vec3 shifted = vec3(
    texture2D(inputBuffer, uvh + ca).r,
    base.g,
    texture2D(inputBuffer, uvh - ca).b
  );

  // Cheap 9-tap edge blur, radius grows toward the corners.
  float k = edge * edgeBlur;
  vec3 col = shifted;
  if (k > 0.001) {
    vec2 o = texelSize * 3.0 * k;
    vec3 acc = shifted;
    acc += texture2D(inputBuffer, uvh + vec2( o.x, 0.0)).rgb;
    acc += texture2D(inputBuffer, uvh + vec2(-o.x, 0.0)).rgb;
    acc += texture2D(inputBuffer, uvh + vec2(0.0,  o.y)).rgb;
    acc += texture2D(inputBuffer, uvh + vec2(0.0, -o.y)).rgb;
    acc += texture2D(inputBuffer, uvh + vec2( o.x,  o.y) * 0.7071).rgb;
    acc += texture2D(inputBuffer, uvh + vec2(-o.x,  o.y) * 0.7071).rgb;
    acc += texture2D(inputBuffer, uvh + vec2( o.x, -o.y) * 0.7071).rgb;
    acc += texture2D(inputBuffer, uvh + vec2(-o.x, -o.y) * 0.7071).rgb;
    col = mix(shifted, acc / 9.0, k);
  }
  outputColor = vec4(col, inputColor.a);
}
`

export interface LensOptions {
  edgeBlur?: number
  aberration?: number
  /** Multiplier on the haze clock (reduced motion passes a small value). */
  timeScale?: number
}

/** Edge blur + chromatic aberration + furnace heat haze. The only convolution effect: keep it FIRST in the composer. */
export class LensEffect extends Effect {
  private clock = 0
  private readonly timeScale: number

  constructor({ edgeBlur = 1, aberration = 1.5, timeScale = 1 }: LensOptions = {}) {
    super('LensEffect', fragmentShader, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['edgeBlur', new Uniform(edgeBlur)],
        ['aberration', new Uniform(aberration)],
        ['haze', new Uniform(0)],
        ['time', new Uniform(0)],
      ]),
    })
    this.timeScale = timeScale
  }

  set edgeBlur(v: number) {
    this.uniforms.get('edgeBlur')!.value = v
  }

  set aberration(v: number) {
    this.uniforms.get('aberration')!.value = v
  }

  set haze(v: number) {
    this.uniforms.get('haze')!.value = Math.min(Math.max(v, 0), 1)
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime = 0): void {
    this.clock += deltaTime * this.timeScale
    this.uniforms.get('time')!.value = this.clock
  }
}
