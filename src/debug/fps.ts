/** Rolling frame-time window. avg = mean fps; low1 = fps of the 99th-percentile frame time. */
export class FpsWindow {
  private readonly dts: number[] = []
  private readonly size: number

  constructor(size = 240) {
    this.size = size
  }

  push(dtMs: number): void {
    // Skip invalid samples and gaps from hidden tabs.
    if (!(dtMs > 0) || dtMs > 1000) return
    this.dts.push(dtMs)
    if (this.dts.length > this.size) this.dts.shift()
  }

  get avg(): number {
    if (this.dts.length === 0) return 0
    const mean = this.dts.reduce((a, b) => a + b, 0) / this.dts.length
    return 1000 / mean
  }

  get low1(): number {
    if (this.dts.length === 0) return 0
    const sorted = [...this.dts].sort((a, b) => a - b)
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))
    return 1000 / sorted[idx]
  }

  reset(): void {
    this.dts.length = 0
  }
}
