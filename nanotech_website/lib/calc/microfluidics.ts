// microfluidics.ts
// Core equations extracted from the scratch work
// Assumptions (match notebook exactly):
// - Liquid: PBS/water at room temp
// - Contact angles = 0° on all walls (cos = 1)
// - Tube is cylindrical; radius r = 0.5 mm
// - The capillary-pressure term uses 1/L + 1/w as in the notes
//   (L appears both in P_cap and the Hagen–Poiseuille resistance)

// ---------- Types ----------
export type MicrofluidicInputs = {
  // tube lengths in mm (each length is treated independently)
  lengths_mm: number[];
  // optional overrides (defaults reproduce the table)
  diameter_mm?: number;        // default 1.0  (so r = 0.0005 m)
  width_m?: number;            // 'w' term from notes; default 0.001 m
  gamma_Npm?: number;          // surface tension γ (N/m); default 0.0722
  eta_NsPm2?: number;          // viscosity η (N·s/m^2); default 0.904e-3
  // allow custom contact angles if needed later (degrees)
  thetaTop_deg?: number;       // default 0
  thetaBottom_deg?: number;    // default 0
  thetaLeft_deg?: number;      // default 0
  thetaRight_deg?: number;     // default 0
};

export type MicrofluidicRow = {
  L_mm: number;      // input length (mm)
  L_m: number;       // input length (m)
  P_cap_Pa: number;  // capillary pressure (Pa)
  Q_m3_s: number;    // flow rate (m^3/s)
  V_m_s: number;     // average velocity (m/s)
  T_s: number;       // transit time (s)
};

export type MicrofluidicResult = {
  inputs: Required<Omit<MicrofluidicInputs, "lengths_mm">> & { lengths_mm: number[] };
  rows: MicrofluidicRow[];
};

// ---------- Helpers ----------
const d2r = (deg: number) => (deg * Math.PI) / 180;

// ---------- Physics (exactly as used in the notes) ----------
// Capillary pressure for this cartridge model (notes use 1/L + 1/w style sum)
//   P_cap = γ * [ (cosθ_top + cosθ_bottom)/L + (cosθ_left + cosθ_right)/w ]
function capillaryPressure(
  L_m: number,
  gamma: number,
  w_m: number,
  ang: { t: number; b: number; l: number; r: number }
) {
  const cosT = Math.cos(ang.t);
  const cosB = Math.cos(ang.b);
  const cosL = Math.cos(ang.l);
  const cosR = Math.cos(ang.r);
  return gamma * ((cosT + cosB) / L_m + (cosL + cosR) / w_m); // Pa (N/m^2)
}

// Fluidic resistance for a circular tube (Hagen–Poiseuille):
//   R_f = 8 L / (π r^4)
function fluidicResistance(L_m: number, r_m: number) {
  return (8 * L_m) / (Math.PI * Math.pow(r_m, 4));
}

// Flow rate (using ΔP = η * R_f * Q  →  Q = P_cap / (η R_f)):
//   Q = (P_cap * π r^4) / (8 η L)
function flowRate(P_cap: number, L_m: number, r_m: number, eta: number) {
  return (P_cap * Math.PI * Math.pow(r_m, 4)) / (8 * eta * L_m);
}

// Average velocity:
//   V = Q / (π r^2) = (P_cap * r^2) / (8 η L)
function velocity(P_cap: number, L_m: number, r_m: number, eta: number) {
  return (P_cap * Math.pow(r_m, 2)) / (8 * eta * L_m);
}

// Transit time for a segment of length L:
//   T = L / V = (8 η L^2) / (P_cap r^2)
function transitTime(P_cap: number, L_m: number, r_m: number, eta: number) {
  return (8 * eta * Math.pow(L_m, 2)) / (P_cap * Math.pow(r_m, 2));
}

// ---------- Main API ----------
export function computeMicrofluidics(i: MicrofluidicInputs): MicrofluidicResult {
  const inputs = {
    lengths_mm: i.lengths_mm,
    diameter_mm: i.diameter_mm ?? 1.0,
    width_m: i.width_m ?? 0.001,
    gamma_Npm: i.gamma_Npm ?? 0.0722,
    eta_NsPm2: i.eta_NsPm2 ?? 0.904e-3,
    thetaTop_deg: i.thetaTop_deg ?? 0,
    thetaBottom_deg: i.thetaBottom_deg ?? 0,
    thetaLeft_deg: i.thetaLeft_deg ?? 0,
    thetaRight_deg: i.thetaRight_deg ?? 0,
  } as Required<MicrofluidicInputs>;

  const r_m = (inputs.diameter_mm / 2) / 1000; // mm → m → radius
  const ang = {
    t: d2r(inputs.thetaTop_deg),
    b: d2r(inputs.thetaBottom_deg),
    l: d2r(inputs.thetaLeft_deg),
    r: d2r(inputs.thetaRight_deg),
  };

  const rows: MicrofluidicRow[] = inputs.lengths_mm.map((L_mm) => {
    const L_m = L_mm / 1000;
    const P = capillaryPressure(L_m, inputs.gamma_Npm, inputs.width_m, ang);
    const Q = flowRate(P, L_m, r_m, inputs.eta_NsPm2);
    const V = velocity(P, L_m, r_m, inputs.eta_NsPm2);
    const T = transitTime(P, L_m, r_m, inputs.eta_NsPm2);
    return { L_mm, L_m, P_cap_Pa: P, Q_m3_s: Q, V_m_s: V, T_s: T };
  });

  return { inputs, rows };
}

// ---------- Quick sanity test (keeps numbers identical to the table) ----------
// Example:
// const out = computeMicrofluidics({ lengths_mm: [50, 132.5, 180.5, 40, 80, 120, 160, 200, 240, 280] });
// console.table(out.rows.map(({ L_mm, T_s }) => ({ L_mm, T_s })));
