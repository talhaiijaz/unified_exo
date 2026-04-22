// CNT Capacitance and Energy calculations (ported from Flask /calculate)

export interface CntInputs {
  r: number // CNT radius (m)
  h: number // CNT length (m)
  x: number // Base width (m)
  y: number // Base length (m)
}

export interface CntResults {
  cnt_surface_area: number
  base_area: number
  num_cnt: number
  total_surface_area: number
  c_pair: number
  c_chip: number
  energy_chip: number
  wh: number
  mah: number
  voltage_assumed: number
}

export function calculateCnt(inputs: CntInputs): CntResults {
  const { r, h, x, y } = inputs

  if (!(r > 0) || !(h > 0) || !(x > 0) || !(y > 0)) {
    throw new Error("All inputs must be positive numbers")
  }

  const PI = Math.PI

  // CNT lateral surface area (no end caps)
  const cnt_surface_area = 2 * PI * r * h

  // Base area
  const base_area = x * y

  // Number of CNTs (simple packing model equivalent to Python code)
  const num_cnt = base_area / (PI * r * r)

  // Total surface area
  const total_surface_area = num_cnt * cnt_surface_area

  // Capacitance pair and chip factors (constants taken from Flask app)
  const factor1 = 4.33e6
  const c_pair = factor1 * cnt_surface_area

  const factor2 = 5040
  const c_chip = c_pair * factor2

  // Energy with assumed voltage
  const V = 1000
  const energy_chip = 0.5 * c_chip * V * V

  // Energy conversions (as per Flask app)
  const wh = energy_chip / 54000
  const mah = wh * 333

  return {
    cnt_surface_area,
    base_area,
    num_cnt,
    total_surface_area,
    c_pair,
    c_chip,
    energy_chip,
    wh,
    mah,
    voltage_assumed: V,
  }
}
