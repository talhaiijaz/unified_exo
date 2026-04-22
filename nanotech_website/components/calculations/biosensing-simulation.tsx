"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DEFAULTS, simulate } from "@/lib/calc/biosensing"

type NumDict = Record<string, number>

export function BiosensingSimulation() {
  const defaults = useMemo(() => DEFAULTS, [])

  const [params, setParams] = useState<NumDict>({
    cnt_radius: defaults.cnt_radius,
    cnt_height: defaults.cnt_height,
    base_width: defaults.base_width,
    base_length: defaults.base_length,
    cnt_gap: defaults.cnt_gap,
    base_thickness: defaults.base_thickness,
    t_si: defaults.t_si,
    t_sio2_1: defaults.t_sio2_1,
    t_sio2_2: defaults.t_sio2_2,
    t_ti: defaults.t_ti,
    t_al2o3: defaults.t_al2o3,
    t_al: defaults.t_al,
    t_fe: defaults.t_fe,
    mol_radius: defaults.mol_radius,
    mol_length: defaults.mol_length,
    mol_gap: defaults.mol_gap,
    er_mol: defaults.er_mol,
    conc_molar: defaults.conc_molar,
    temperature: defaults.temperature,
    zeta_potential: defaults.zeta_potential,
    er_solvent: defaults.er_solvent,
    freq_stage1: defaults.freq_stage1,
    freq_stage2: defaults.freq_stage2,
    series_resistance: defaults.series_resistance,
  })

  const [results, setResults] = useState<ReturnType<typeof simulate> | null>(null)
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null)

  const run = () => setResults(simulate(params as any))
  const fmt = (n: number) => n.toExponential(3)

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Biosensing Theoretical Simulation</h2>
          <p className="text-muted-foreground">Preserves original images and highlight mapping; TS math parity with the legacy sheet.</p>
        </div>
        <Badge>Active</Badge>
      </div>

      {/* Nanostructure */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Nanostructure Parameters</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ["cnt_radius", "Radius of CNT (m)", "ns-radius"],
                ["cnt_height", "Height of CNT (m)", "ns-height"],
                ["base_width", "Width of Base (m)", "ns-width"],
                ["cnt_gap", "Gap Between CNTs (m)", "ns-gap"],
                ["base_length", "Length of Base (m)", "ns-length"],
                ["base_thickness", "Thickness of Base (m)", "ns-thick"],
              ] as const
            ).map(([key, label, hid]) => (
              <Field
                key={key}
                label={label}
                value={params[key]}
                setValue={(v)=>setParams(p=>({...p,[key]:v}))}
                onActivate={() => setActiveHighlight(hid)}
                onDeactivate={() => setActiveHighlight(null)}
              />
            ))}
          </div>
        </Card>
        <Card className="p-6 relative">
          <div className="text-sm text-muted-foreground mb-2">Sketch</div>
          <div className="relative">
            <img src="/biosensing/CNTimage.png" alt="CNT sketch" className="w-full rounded border border-border" />
            {/* Highlight boxes - visible only when active id matches */}
            <Highlight id="ns-radius" activeId={activeHighlight} style={{ top: '17%', left: '11%', width: '6%', height: '6%' }} />
            <Highlight id="ns-height" activeId={activeHighlight} style={{ top: '23%', left: '20%', width: '5%', height: '45%' }} />
            <Highlight id="ns-width" activeId={activeHighlight} style={{ top: '75%', left: '40%', width: '23%', height: '10%' }} />
            <Highlight id="ns-gap" activeId={activeHighlight} style={{ top: '63%', left: '46%', width: '5%', height: '5%' }} />
            <Highlight id="ns-length" activeId={activeHighlight} style={{ top: '65%', left: '63%', width: '27%', height: '10%' }} />
            <Highlight id="ns-thick" activeId={activeHighlight} style={{ top: '45%', left: '87%', width: '4%', height: '8%' }} />
          </div>
        </Card>
      </div>

      {/* Materials stack */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Materials Stack Parameters</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ["t_si", "Silicon Thickness (m)", "ms-si"],
                ["t_sio2_1", "SiO₂ Thickness (m)", "ms-sio2-1"],
                ["t_sio2_2", "SiO₂ Thickness 2 (m)", "ms-sio2-2"],
                ["t_ti", "Titanium Thickness (m)", "ms-ti"],
                ["t_al2o3", "Alumina Thickness (m)", "ms-al2o3"],
                ["t_al", "Aluminum Thickness (m)", "ms-al"],
                ["t_fe", "Iron Thickness (m)", "ms-fe"],
              ] as const
            ).map(([key, label, hid]) => (
              <Field
                key={key}
                label={label}
                value={params[key]}
                setValue={(v)=>setParams(p=>({...p,[key]:v}))}
                onActivate={() => setActiveHighlight(hid)}
                onDeactivate={() => setActiveHighlight(null)}
              />
            ))}
          </div>
        </Card>
        <Card className="p-6 relative">
          <div className="text-sm text-muted-foreground mb-2">Stack</div>
          <div className="relative">
            <img src="/biosensing/dielecimage.png" alt="Stack sketch" className="w-full rounded border border-border" />
            <Highlight id="ms-si" activeId={activeHighlight} style={{ top: '60%', left: '88%', width: '6%', height: '10%' }} />
            <Highlight id="ms-sio2-1" activeId={activeHighlight} style={{ top: '55%', left: '88%', width: '6%', height: '6%' }} />
            <Highlight id="ms-sio2-2" activeId={activeHighlight} style={{ top: '45%', left: '88%', width: '6%', height: '6%' }} />
            <Highlight id="ms-ti" activeId={activeHighlight} style={{ top: '26%', left: '88%', width: '6%', height: '4%' }} />
            <Highlight id="ms-al2o3" activeId={activeHighlight} style={{ top: '50%', left: '88%', width: '6%', height: '6%' }} />
            <Highlight id="ms-al" activeId={activeHighlight} style={{ top: '43%', left: '88%', width: '6%', height: '3%' }} />
            <Highlight id="ms-fe" activeId={activeHighlight} style={{ top: '39%', left: '88%', width: '6%', height: '3%' }} />
          </div>
        </Card>
      </div>

      {/* Functionalization */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Functionalization & Analyte</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ["mol_radius", "Radius of Molecule (m)"],
              ["mol_length", "Length of Molecule (m)"],
              ["mol_gap", "Gap Between Molecules (m)"],
              ["er_mol", "Dielectric of Molecule (-)"],
            ].map(([key, label]) => (
              <Field key={key} label={label} value={params[key]} setValue={(v)=>setParams(p=>({...p,[key]:v}))} />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <img src="/biosensing/funcimage.png" alt="DNA sketch" className="w-full rounded border border-border" />
        </Card>
      </div>

      {/* Dielectric */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Dielectric</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ["conc_molar", "Bulk Concentration (M)"],
                ["er_solvent", "Relative Permittivity (-)"],
                ["freq_stage1", "Frequency Stage 1 (Hz)"],
                ["freq_stage2", "Frequency Stage 2 (Hz)"],
                ["series_resistance", "Series Resistance (Ω)"],
                ["temperature", "Temperature (K)"],
                ["zeta_potential", "Zeta Potential (V)"],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={params[key]}
                setValue={(v)=>setParams(p=>({...p,[key]:v}))}
                onActivate={() => setActiveHighlight(null)}
                onDeactivate={() => setActiveHighlight(null)}
              />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <img src="/biosensing/matstaximage.png" alt="Dielectric sketch" className="w-full rounded border border-border" />
        </Card>
      </div>

      <Button onClick={run} className="gap-2">Run Simulation</Button>

      {results && (
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Results</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1">Quantity</th>
                <th className="text-left py-1">Stage 1</th>
                <th className="text-left py-1">Stage 2</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border"><td className="py-1">Capacitance (F)</td><td className="py-1">{fmt(results.stage1.C)}</td><td className="py-1">{fmt(results.stage2.C)}</td></tr>
              <tr className="border-t border-border"><td className="py-1">Impedance |Z| (Ω)</td><td className="py-1">{fmt(results.stage1.Z)}</td><td className="py-1">{fmt(results.stage2.Z)}</td></tr>
              <tr className="border-t border-border"><td className="py-1">Current (A)</td><td className="py-1">{fmt(results.stage1.I)}</td><td className="py-1">{fmt(results.stage2.I)}</td></tr>
              <tr className="border-t border-border"><td className="py-1">ΔI (A)</td><td className="py-1" colSpan={2}>{fmt(results.Delta_I)}</td></tr>
              <tr className="border-t border-border"><td className="py-1">ΔZ (Ω)</td><td className="py-1" colSpan={2}>{fmt(results.Delta_Z)}</td></tr>
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function Field({ label, value, setValue, onActivate, onDeactivate }: { label: string; value: number; setValue: (v: number) => void; onActivate?: () => void; onDeactivate?: () => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        step="any"
        onFocus={() => onActivate && onActivate()}
        onClick={() => onActivate && onActivate()}
        onBlur={() => onDeactivate && onDeactivate()}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  )
}

function Highlight({ id, activeId, style }: { id: string; activeId: string | null; style: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={`absolute border-2 border-yellow-400/80 bg-yellow-400/10 rounded pointer-events-none transition-opacity duration-150 ${activeId === id ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}
