// NiTRO Calculation Utilities
// Port of utils/funcs.py from Python to TypeScript

// **********************
// Wave Generation
// **********************

export interface WaveData {
  t: number[]
  values: number[]
}

export function generateWave(
  freq: number,
  amp: number,
  form: 'sin' | 'triangle',
  cycleNum: number
): WaveData {
  const duration = cycleNum / freq
  const sampRate = freq * 100 // 100 samples per cycle
  const sampNum = Math.round(duration * sampRate)
  
  const t: number[] = []
  const values: number[] = []
  
  if (form === 'sin') {
    for (let i = 0; i < sampNum; i++) {
      const time = (i * duration) / sampNum
      t.push(time)
      values.push(amp * Math.sin(freq * 2 * Math.PI * time))
    }
  } else if (form === 'triangle') {
    for (let i = 0; i < sampNum; i++) {
      const time = (i * duration) / sampNum
      // Phase in [0, 1)
      const phase = ((cycleNum * i) / sampNum) % 1
      t.push(time)
      // Triangle wave that starts at -amp, peaks at +amp mid-cycle, then returns to -amp
      // Formula equivalent to scipy.signal.sawtooth(..., width=0.5)
      const tri = 1 - 4 * Math.abs(phase - 0.5)
      values.push(amp * tri)
    }
  }
  
  return { t, values }
}

// **********************
// RC Circuit Calculations
// **********************

export interface ComplexNumber {
  real: number
  imag: number
}

export function complexMagnitude(c: ComplexNumber): number {
  return Math.sqrt(c.real * c.real + c.imag * c.imag)
}

export function complexAngle(c: ComplexNumber): number {
  return Math.atan2(c.imag, c.real)
}

export function complexDivide(num: ComplexNumber, denom: ComplexNumber): ComplexNumber {
  const denomMag = denom.real * denom.real + denom.imag * denom.imag
  return {
    real: (num.real * denom.real + num.imag * denom.imag) / denomMag,
    imag: (num.imag * denom.real - num.real * denom.imag) / denomMag
  }
}

export function calculateImpedance(R: number, C: number, freq: number): ComplexNumber {
  const w = 2 * Math.PI * freq
  return {
    real: R,
    imag: -1 / (w * C)
  }
}

export function generateIOutSin(
  t: number[],
  freq: number,
  IAmp: number,
  phase: number
): number[] {
  return t.map(time => IAmp * Math.sin(freq * 2 * Math.PI * time + phase))
}

export function getVOut(VIn: number[], IOut: number[], Rf: number): number[] {
  const rail = 1.65
  return VIn.map((v, i) => {
    let vOut = v - IOut[i] * Rf
    if (vOut > rail) vOut = rail
    if (vOut < -rail) vOut = -rail
    return vOut
  })
}

export function digitize(wave: number[], numLevels: number): number[] {
  const VAmp = 1.65
  const levels: number[] = []
  
  for (let i = 0; i <= numLevels; i++) {
    levels.push((2 * VAmp * i - VAmp * numLevels) / numLevels)
  }
  
  return wave.map(val => {
    let level = 0
    for (let i = 0; i < levels.length - 1; i++) {
      if (val >= levels[i] && val < levels[i + 1]) {
        level = i
        break
      }
    }
    return level * (2 * VAmp / numLevels)
  })
}

// **********************
// Triangle Wave Calculations
// **********************

function getVr(V0: number, t: number[], freq: number, amp: number, sgn: number, R: number, C: number): number[] {
  const a = sgn * 4 * freq * amp
  const B = a * R * C - V0
  
  return t.map(time => a * R * C - B * Math.exp(-time / (R * C)))
}

export function getVrOut(
  t: number[],
  cycleNum: number,
  freq: number,
  amp: number,
  R: number,
  C: number
): number[] {
  const Vr = new Array(t.length).fill(0)
  const n = t.length
  const k = Math.floor(n / cycleNum / 2)

  let currV = 0
  let sgn = 1
  
  // t_slice is first k elements (Python: t[:k])
  const tSlice = t.slice(0, k)

  for (let w = 0; w < cycleNum * 2; w++) {
    const vrSlice = getVr(currV, tSlice, freq, amp, sgn, R, C)
    
    for (let i = 0; i < k && w * k + i < n; i++) {
      Vr[w * k + i] = vrSlice[i]
    }
    // Update currV to voltage at end of this half-cycle (Python: currV = get_Vr(currV, t[k], ...))
    if (k < t.length) {
      const vrNext = getVr(currV, [t[k]], freq, amp, sgn, R, C)
      currV = vrNext[0]
    }
    sgn = -sgn
  }
  return Vr
}

// **********************
// Machine Learning (FMM Algorithm)
// **********************

export function fitLog(X: number[], y: number[]): [number, number] {
  // Fit logarithmic model: y = a * log(X) + b
  const n = X.length
  const logX = X.map(x => Math.log(x))
  
  let sumLogX = 0
  let sumY = 0
  let sumLogXY = 0
  let sumLogX2 = 0
  
  for (let i = 0; i < n; i++) {
    sumLogX += logX[i]
    sumY += y[i]
    sumLogXY += logX[i] * y[i]
    sumLogX2 += logX[i] * logX[i]
  }
  
  const a = (n * sumLogXY - sumLogX * sumY) / (n * sumLogX2 - sumLogX * sumLogX)
  const b = (sumY - a * sumLogX) / n
  
  return [a, b]
}

export function predictLog(x: number, w: [number, number]): number {
  const [a, b] = w
  return a * Math.log(x) + b
}

export function predictExp(x: number, w: [number, number]): number {
  const [a, b] = w
  return Math.exp((x - b) / a)
}

export function fit(X: number[][], y: number[]): [number, number][] {
  // X is m x n matrix, y is m x 1 vector
  const m = X.length
  const n = X[0].length
  const weights: [number, number][] = []
  
  for (let i = 0; i < n; i++) {
    const column = X.map(row => row[i])
    weights.push(fitLog(y, column))
  }
  
  return weights
}

export function predict(
  X: number[],
  w: [number, number][],
  excludeFns: number = 0
): { prediction: number, predictions: number[] } {
  const n = X.length
  const preds: number[] = []
  
  for (let j = 0; j < w.length - excludeFns; j++) {
    preds.push(predictExp(X[j], w[j]))
  }
  
  // Geometric mean
  const gmean = Math.exp(preds.reduce((sum, val) => sum + Math.log(val), 0) / preds.length)
  
  return { prediction: gmean, predictions: preds }
}

// **********************
// Data Generation for Training
// **********************

export function freqSweepAtC(
  c: number,
  weights: [number, number][],
  freqs: number[]
): number[] {
  return freqs.map((_, i) => predictLog(c, weights[i]))
}

export function generateExperiment(
  concs: number[],
  weights: [number, number][],
  freqs: number[]
): number[][] {
  return concs.map(c => freqSweepAtC(c, weights, freqs))
}

export function generateNoise(m: number, n: number, noiseAtFreq: number[]): number[][] {
  const noise: number[][] = []
  
  for (let i = 0; i < m; i++) {
    const row: number[] = []
    for (let j = 0; j < n; j++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random()
      const u2 = Math.random()
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      row.push(z0 * noiseAtFreq[j])
    }
    noise.push(row)
  }
  
  return noise
}

export function avgNoise(
  nSamples: number,
  noiseAtFreq: number[],
  m: number,
  n: number
): number[][] {
  const agg: number[][] = Array(m).fill(0).map(() => Array(n).fill(0))
  
  for (let i = 0; i < nSamples; i++) {
    const noise = generateNoise(m, n, noiseAtFreq)
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < n; c++) {
        agg[r][c] += noise[r][c] / nSamples
      }
    }
  }
  
  return agg
}

// **********************
// Formatting Helpers
// **********************

export function formatScientific(num: number, decimals: number = 2): string {
  return num.toExponential(decimals)
}

export function formatFixed(num: number, decimals: number = 4): string {
  return num.toFixed(decimals)
}
