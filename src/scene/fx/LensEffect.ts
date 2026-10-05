import { Effect, EffectAttribute } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float edgeBlur;   // 0 = off, 1 = full edge blur
uniform float aberration; // chromatic shift in pixels at the corners

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 d = uv - 0.5;
  float r = length(d) * 1.41421356;       // 0 center, 1 corners
  float edge = smoothstep(0.35, 1.0, r);

  // Chromatic aberration grows toward the edges.
  vec2 ca = normalize(d + 1e-6) * aberration * edge * texelSize;
  vec3 shifted = vec3(
    texture2D(inputBuffer, uv + ca).r,
    inputColor.g,
    texture2D(inputBuffer, uv - ca).b
  );

  // Cheap 9-tap edge blur, radius grows toward the corners.
  float k = edge * edgeBlur;
  vec3 col = shifted;
  if (k > 0.001) {
    vec2 o = texelSize * 3.0 * k;
    vec3 acc = shifted;
    acc += texture2D(inputBuffer, uv + vec2( o.x, 0.0)).rgb;
    acc += texture2D(inputBuffer, uv + vec2(-o.x, 0.0)).rgb;
    acc += texture2D(inputBuffer, uv + vec2(0.0,  o.y)).rgb;
    acc += texture2D(inputBuffer, uv + vec2(0.0, -o.y)).rgb;
    acc += texture2D(inputBuffer, uv + vec2( o.x,  o.y) * 0.7071).rgb;
    acc += texture2D(inputBuffer, uv + vec2(-o.x,  o.y) * 0.7071).rgb;
    acc += texture2D(inputBuffer, uv + vec2( o.x, -o.y) * 0.7071).rgb;
    acc += texture2D(inputBuffer, uv + vec2(-o.x, -o.y) * 0.7071).rgb;
    col = mix(shifted, acc / 9.0, k);
  }
  outputColor = vec4(col, inputColor.a);
}
`

export interface LensOptions {
  edgeBlur?: number
  aberration?: number
}

/** Edge blur + chromatic aberration. The only convolution effect: keep it FIRST in the composer. */
export class LensEffect extends Effect {
  constructor({ edgeBlur = 1, aberration = 1.5 }: LensOptions = {}) {
    super('LensEffect', fragmentShader, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['edgeBlur', new Uniform(edgeBlur)],
        ['aberration', new Uniform(aberration)],
      ]),
    })
  }

  set edgeBlur(v: number) {
    this.uniforms.get('edgeBlur')!.value = v
  }

  set aberration(v: number) {
    this.uniforms.get('aberration')!.value = v
  }
}
