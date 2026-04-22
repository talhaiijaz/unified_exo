// RC-related calculators: Sheet1, Vo&Rf, and Vx(t)

export interface Sheet1Inputs {
  f: number
  C: number
  R: number
  Vfix: number
  Vin: number
  Rf: number
}

export interface Sheet1Results {
  T: number | null
  two_pi_f_C: number
  Xc: number | null
  R2_plus_Xc2: number
  Z: number
  i: number | null
  Vwork: number
  Vout: number
  Vmax: number
  Vmin: number
  amplitude: number
}

export function calculateSheet1(inputs: Sheet1Inputs): Sheet1Results {
  const { f, C, R, Vfix, Vin, Rf } = inputs
  const PI = 22 / 7 // parity with Flask

  const T = f !== 0 ? 1.0 / f : null
  const two_pi_f_C = 2 * PI * f * C
  const Xc = two_pi_f_C !== 0 ? 1.0 / two_pi_f_C : null
  const R2_plus_Xc2 = R * R + ((Xc ?? 0) * (Xc ?? 0))
  const Z = Math.sqrt(R2_plus_Xc2)
  const i = Z !== 0 ? Vin / Z : null

  const Vwork = Vfix + Vin
  const Vout = Vwork + (i ?? 0) * Rf

  const Vmax = Math.abs(Vin)
  const Vmin = -Math.abs(Vin)
  const amplitude = Math.abs(Vin)

  return {
    T,
    two_pi_f_C,
    Xc,
    R2_plus_Xc2,
    Z,
    i,
    Vwork,
    Vout,
    Vmax,
    Vmin,
    amplitude,
  }
}

export interface VoRfInputs {
  f: number
  Vmax: number
  Vmin: number
  R: number
  C: number
  Rf: number
  t: number
  Vref: number
}

export interface Branch {
  Vwork: number
  i: number
  Vo: number
}

export interface VoRfResults {
  Vpeak: number
  Xc: number
  Z: number
  i_mag: number
  i_peak: number
  down: Branch
  up: Branch
}

export function calculateVoRf(inputs: VoRfInputs): VoRfResults {
  const { f, Vmax, Vmin, R, C, Rf, t, Vref } = inputs
  const PI = 22 / 7

  const Vpeak = (Vmax - Vmin) / 2
  const Xc = 1 / (2 * PI * f * C)
  const Z = Math.sqrt(R * R + Xc * Xc)
  const i_mag = Vpeak / Z

  function branch(sign: number): Branch {
    const slope = sign * 2 * f * Vpeak
    const Vwork = slope * t + Vref
    const i = -sign * i_mag
    const Vo = Vwork + i * Rf
    return { Vwork, i, Vo }
  }

  return {
    Vpeak,
    Xc,
    Z,
    i_mag,
    i_peak: i_mag,
    down: branch(-1),
    up: branch(+1),
  }
}

export interface VxInputs {
  Vmax: number
  Vmin: number
  f: number
}

export interface VxResults {
  t: number[]
  vx: number[]
  Vpeak: number
  f: number
}

export function calculateVx(inputs: VxInputs): VxResults {
  const { Vmax, Vmin, f } = inputs
  const Vpeak = (Vmax - Vmin) / 2
  const t_vals = [0, 0.25, 0.5, 0.75, 1]
  const vx_vals = t_vals.map((t) => Vpeak * t)
  return { t: t_vals, vx: vx_vals, Vpeak, f }
}
