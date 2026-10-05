import { Effect } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float temperature; // 0 cold blueprint, 0.5 neutral, 1 molten
uniform float vignette;    // corner darkening strength

vec3 tempTint(float t) {
  vec3 cold = vec3(0.82, 0.93, 1.10);
  vec3 hot = vec3(1.20, 0.90, 0.68);
  return t < 0.5 ? mix(cold, vec3(1.0), t * 2.0) : mix(vec3(1.0), hot, (t - 0.5) * 2.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = inputColor.rgb * tempTint(temperature);
  float r = length(uv - 0.5) * 1.41421356;
  col *= 1.0 - vignette * smoothstep(0.45, 1.05, r);
  outputColor = vec4(col, inputColor.a);
}
`

/** Frame temperature grade (cold -> hot along the story) + vignette. Runs after tone mapping. */
export class GradeEffect extends Effect {
  constructor({ temperature = 0, vignette = 0.35 }: { temperature?: number; vignette?: number } = {}) {
    super('GradeEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['temperature', new Uniform(temperature)],
        ['vignette', new Uniform(vignette)],
      ]),
    })
  }

  set temperature(v: number) {
    this.uniforms.get('temperature')!.value = Math.min(Math.max(v, 0), 1)
  }

  set vignette(v: number) {
    this.uniforms.get('vignette')!.value = v
  }
}
