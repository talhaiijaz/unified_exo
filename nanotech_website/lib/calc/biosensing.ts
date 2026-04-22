// Biosensing theoretical simulation (ported from Flask simulate())

const E = 1.602e-19
const kB = 1.380e-23
const Na = 6.022e23
const eps0 = 8.854e-12
const ER_WAT = 78.49
const ZVAL = 1
const PI = Math.PI

export const DEFAULTS = {
  cnt_radius: 5e-9,
  cnt_height: 1e-4,
  base_width: 1e-5,
  base_length: 1e-5,
  cnt_gap: 0.0,
  base_thickness: 5.5412e-4,

  t_si: 3e-4,
  t_sio2_1: 2.1e-6,
  t_sio2_2: 1e-6,
  t_ti: 1e-7,
  t_al2o3: 1e-8,
  t_al: 1e-8,
  t_fe: 1e-8,

  mol_radius: 5e-10,
  mol_length: 2e-9,
  mol_gap: 1e-9,
  er_mol: 8.0,

  conc_molar: 10.0,
  temperature: 298.1,
  zeta_potential: 0.05,
  er_solvent: ER_WAT,
  freq_stage1: 1e5,
  freq_stage2: 1e4,
  series_resistance: 1e5,

  energy_density: "",
  voltage: "",
  max_vout: "",
  concentration_standard: "",
  ion_species_change: "",
  charging_current: "",
  charging_voltage: "",
  lens_resistivity: "",
  lens_density: "",
  lens_specific_heat: "",
  lens_height: "",
  lens_area: "",
  lens_r_in: "",
  lens_r_out: "",
  lithography_time: "",
}

function toFloatOrDefault(v: any, d: number): number {
  return v === "" || v === null || v === undefined ? d : Number(v)
}

export interface BiosensingInputs extends Partial<typeof DEFAULTS> {}

export interface BiosensingStage {
  C: number
  Z: number
  I: number
  Vo: number
}

export interface BiosensingResults {
  stage1: BiosensingStage
  stage2: BiosensingStage
  Delta_I: number
  Delta_Z: number
}

export function simulate(raw: BiosensingInputs): BiosensingResults {
  const p: Record<string, number> = {}
  for (const [k, v] of Object.entries(DEFAULTS)) {
    if (typeof v === "number") {
      p[k] = toFloatOrDefault((raw as any)[k], v)
    }
  }

  const C0 = p["conc_molar"] * 1e3
  const cosh = Math.cosh((ZVAL * E * p["zeta_potential"]) / (2 * kB * p["temperature"]))
  const C_EDL_A = Math.sqrt(
    2 * eps0 * p["er_solvent"] * Na * C0 * (ZVAL * E) ** 2 / (kB * p["temperature"])
  ) * cosh

  const Sa_cnt = PI * p["cnt_radius"] ** 2 + 2 * PI * p["cnt_radius"] * p["cnt_height"]
  const n_cnt = (p["base_width"] * p["base_length"]) / (PI * (2 * p["cnt_radius"]) ** 2)
  const Sa_tot = Sa_cnt * n_cnt

  const C_EDL = C_EDL_A * Sa_tot
  const C_H = eps0 * p["er_mol"] / p["mol_length"] * Sa_tot
  const C_Hp = C_H

  const C1 = 1 / (1 / C_EDL + 1 / C_H)
  const Z1 = 1 / (2 * PI * p["freq_stage1"] * C1)
  const I1 = p["zeta_potential"] / Z1
  const Vo1 = p["series_resistance"] * Math.abs(2 * p["freq_stage1"] * C1 * (1.65 - 0))

  const C2 = 1 / (1 / C_EDL + 1 / C_H + 1 / C_Hp)
  const Z2 = 1 / (2 * PI * p["freq_stage2"] * C2)
  const I2 = p["zeta_potential"] / Z2
  const Vo2 = p["series_resistance"] * Math.abs(2 * p["freq_stage2"] * C2 * (1.65 - 0))

  return {
    stage1: { C: C1, Z: Z1, I: I1, Vo: Vo1 },
    stage2: { C: C2, Z: Z2, I: I2, Vo: Vo2 },
    Delta_I: I1 - I2,
    Delta_Z: Z1 - Z2,
  }
}
