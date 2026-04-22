# Theoretical Simulations

Standalone HTML simulation tools served as static assets by Next.js. Each file is a fully self-contained simulator — no backend required.

---

## Available Simulations

### CNT Nanosensor Unified Simulation

**File:** [`cnt-nanosensor.html`](cnt-nanosensor.html)
**Author:** Tyler Wang
**Version:** v1.0 + CapImpedance + SimRC + NanoLam

A comprehensive theoretical physics simulation for Carbon Nanotube (CNT) based nanosensors. Covers the full pipeline from geometry to detection signal.

**Modules included:**

| Module | What it calculates |
|--------|---------------------|
| **CNT / NS Geometry** | Surface area, # CNTs per nanostructure, nanostructure pairs per chip, stack total thickness |
| **Capacitor & Energy Design** | Cylindrical coaxial capacitance, chip energy (Wh, J, mAh), energy density (Wh/kg, Wh/L) |
| **Electric Double Layer (EDL)** | Debye length, C_EDL/area, cosh correction factor, per-CNT / per-NS capacitance |
| **DNA Hybridization Detection** | C before/after, ΔC binding signal, ΔZ, Δi — with series resistance and R_ext models |
| **Charging / Discharging** | Time, power loss, total ΔT, per-material thermal change |
| **Circuit Impedance** | Period, Xc, |Z|, i=V/Z, Vout, circuit amplitude |
| **Vo & Rf Calculations** | Peak, Vpp, phase angle, slew rate, V_work pos/neg |
| **Functionalization Molecules** | # molecules/CNT, surface concentration, molarity on NS |
| **Mass & Volume** | Per-NS mass, chip mass, chip volume |
| **Temperature per material** | Heat distribution across Si, SiO₂, Ti, Al₂O₃, Al, Fe, CNT, Dielectric |
| **Multi-Frequency Analysis** | Sweep 12 custom frequencies, Bode, phase, capacitance, current |
| **Multi-Chemical Comparison** | Compare up to 6 analytes (yeast, tacrolimus, oxalate, pyridine, etc.) |
| **SimRC v1.0** | RC circuit waveform simulator, DFT impedance extraction, Bode, Nyquist |
| **NanoLam** | Nanolaminate dielectrics from first principles (Born charges → κ, defect hopping → σ, Maxwell-Wagner cascade) |
| **FMM — NiTRO** | Functional Mixture Modeling with real yeast (*S. cerevisiae*) data. Predicts concentration from noisy impedance curves. |
| **EIS Upload** | FFT-based impedance extraction from user CSV files |
| **Concentration Predictor** | Inverse model: measured \|Z\| → predicted analyte concentration |
| **Sensitivity Analysis** | ±1% perturbation showing which parameters drive each output most |
| **Units Reference** | Physical constants, key formulas, unit conversions |

**Tech stack:** Vanilla JavaScript + Chart.js (loaded from CDN). No build step, no frontend framework. Runs entirely in the browser.

**Access:**
- Via Next.js portal: `http://localhost:3000/portal/cnt-simulation`
- Direct: `http://localhost:3000/simulations/cnt-nanosensor.html`

---

## File Size Note

The CNT simulation HTML is ~300KB (mostly embedded Base64 reference diagrams). When deploying to production, consider:

- Enabling gzip/brotli compression on your web server (Vercel/Caddy/Nginx do this by default)
- Lazy-loading the simulation (only fetch when user navigates to it)

---

## Encoding Note

If you see garbled characters (Ω, μ, ε showing as strange text) in the simulation:

1. The source file may have been saved in a non-UTF-8 encoding at some point.
2. Re-export from the original source as **UTF-8** encoding.
3. Or run this command to attempt automatic fix (macOS/Linux):

```bash
python3 -c "
import sys
content = open('cnt-nanosensor.html', 'rb').read()
# Try to fix double-encoded UTF-8
try:
    fixed = content.decode('utf-8').encode('latin-1').decode('utf-8')
    open('cnt-nanosensor.html', 'w').write(fixed)
    print('Fixed encoding successfully')
except Exception as e:
    print(f'Could not auto-fix: {e}')
"
```

---

## Adding New Simulations

To add another standalone HTML simulator:

1. Drop the HTML file into this directory: `nanotech_website/public/simulations/my-sim.html`
2. Create a new Next.js page: `nanotech_website/app/portal/my-sim/page.tsx` (use `cnt-simulation/page.tsx` as a template)
3. Update this README
4. Link from the main portal landing page

---

## Related Documents

- [../../EXO_README.md](../../EXO_README.md) — Frontend overview
- [../../../README.md](../../../README.md) — Project overview
- [../../../STRUCTURE.md](../../../STRUCTURE.md) — Full project map
