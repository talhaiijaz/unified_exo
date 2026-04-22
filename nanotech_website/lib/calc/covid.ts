// COVID Detection calculations (ported from Flask /calculate_covid)

export interface CovidInputs {
  epsilon_r: number
  z: number
  V_zeta: number
  C0: number
  freq: number
  freq2: number
  r_CNT: number
  h_CNT: number
  chip_L: number
  chip_W: number
  gap_d1: number
  gap_d2: number
  er_DNA: number
  L_DNA: number
  R_fixed: number
}

export interface CovidResults {
  [key: string]: string
}

const PI = Math.PI

// Fundamental constants (scipy.constants equivalents)
const eps0 = 8.8541878128e-12
const e_ch = 1.602176634e-19
const k_B = 1.380649e-23
const N_A = 6.02214076e23

export function calculateCovid(d: CovidInputs): CovidResults {
  const epsilon_r = d.epsilon_r
  const z = d.z
  const V_zeta = d.V_zeta
  const C0 = d.C0
  const freq1 = d.freq
  const freq2 = d.freq2

  const r_CNT = d.r_CNT
  const h_CNT = d.h_CNT
  const chip_L = d.chip_L
  const chip_W = d.chip_W
  const gap_d1 = d.gap_d1
  const gap_d2 = d.gap_d2
  const er_DNA = d.er_DNA
  const L_DNA = d.L_DNA
  const R_fixed = d.R_fixed

  const SA_1_CNT = 2 * PI * r_CNT * h_CNT
  const CNT_count = (chip_L * chip_W) / SA_1_CNT

  const d_EDL = Math.sqrt((epsilon_r * eps0 * k_B * 298.1) / (2 * (z * e_ch) ** 2 * N_A * C0))

  const pre_factor = Math.sqrt(2 * (z * e_ch) ** 2 * N_A * C0 * epsilon_r * eps0 / (k_B * 298.1))
  const cosh_term = Math.cosh((z * e_ch * V_zeta) / (2 * k_B * 298.1))
  const CEDL_1_CNT = SA_1_CNT * pre_factor * cosh_term
  const CEDL_total = CEDL_1_CNT * CNT_count

  const CH_per_area = eps0 * epsilon_r / gap_d1
  const CH = CH_per_area * SA_1_CNT * CNT_count
  const CH1_per_area = eps0 * er_DNA / L_DNA
  const CH1 = CH1_per_area * SA_1_CNT * CNT_count

  const inv_C1 = 1 / CH + 1 / CEDL_total
  const C1 = 1 / inv_C1
  const Z1 = 1 / (2 * PI * freq1 * C1)
  const I1 = V_zeta / Z1

  const Z_RC = Math.sqrt(R_fixed ** 2 + (1 / (2 * PI * freq1 * C1)) ** 2)
  const I_RC = V_zeta / Z_RC

  const inv_C2 = 1 / CH + 1 / CH1 + 1 / CEDL_total
  const C2 = 1 / inv_C2
  const Z2 = 1 / (2 * PI * freq2 * C2)
  const I2 = V_zeta / Z2

  const delta_I = Math.abs(I1 - I2)
  const delta_Z = Z1 - Z2
  const delta_C = C1 - C2

  const C_EDL_per_area = CEDL_1_CNT / SA_1_CNT
  const CH_per_CNT = CH / CNT_count
  const CH1_per_CNT = CH1 / CNT_count

  const F_eNA = e_ch * N_A
  const R_kNa = k_B * N_A

  const format = (x: number) => x.toExponential(3)

  const out: CovidResults = {
    "SA_1_CNT (m^2)": format(SA_1_CNT),
    "CNT_count": (CNT_count.toFixed(3)),
    "Debye Length d_EDL (m)": format(d_EDL),
    "C_EDL_one_CNT (F)": format(CEDL_1_CNT),
    "C_EDL_total (F)": format(CEDL_total),
    "CH (F)": format(CH),
    "CH1 (F)": format(CH1),
    "C_EDL/A (F/m^2)": format(pre_factor),
    "cosh_term": format(cosh_term),
    "F = e·N_A (C/mol)": F_eNA.toFixed(3),
    "R = k·N_A (J/mol·K)": R_kNa.toFixed(3),
    "Z_CEDL_total (Ω)": format(1 / (2 * PI * freq2 * CEDL_total)),
    "C_EDL_per_area (F/m^2)": format(C_EDL_per_area),
    "CH_per_area (F/m^2)": format(CH_per_area),
    "CH1_per_area (F/m^2)": format(CH1_per_area),
    "C_EDL_per_CNT (F)": format(CEDL_1_CNT),
    "CH_per_CNT (F)": format(CH_per_CNT),
    "CH1_per_CNT (F)": format(CH1_per_CNT),
    "1/C_branch1 (1/F)": format(1 / C1),
    "1/C_branch2 (1/F)": format(1 / C2),
    "C_total_branch1 (F)": format(C1),
    "Z_branch1 (Ω)": format(Z1),
    "I_branch1 (A)": format(I1),
    "Z_RC (Ω)": format(Z_RC),
    "I_with_R (A)": format(I_RC),
    "C_total_branch2 (F)": format(C2),
    "Z_branch2 (Ω)": format(Z2),
    "I_branch2 (A)": format(I2),
    "ΔI (A)": format(delta_I),
    "ΔZ (Ω)": format(delta_Z),
    "ΔC (F)": format(delta_C),
  }

  return out
}
