"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { computeMicrofluidics } from "@/lib/calc/microfluidics"
import type { MicrofluidicResult } from "@/lib/calc/microfluidics"

export function MicrofluidicsCalculator() {
  // Input state
  const [lengthsInput, setLengthsInput] = useState("50, 132.5, 180.5, 40, 80, 120, 160, 200, 240, 280")
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Advanced parameters (optional overrides)
  const [diameter_mm, setDiameter_mm] = useState(1.0)
  const [width_m, setWidth_m] = useState(0.001)
  const [gamma_Npm, setGamma_Npm] = useState(0.0722)
  const [eta_NsPm2, setEta_NsPm2] = useState(0.904e-3)
  const [thetaTop, setThetaTop] = useState(0)
  const [thetaBottom, setThetaBottom] = useState(0)
  const [thetaLeft, setThetaLeft] = useState(0)
  const [thetaRight, setThetaRight] = useState(0)
  
  // Results state
  const [results, setResults] = useState<MicrofluidicResult | null>(null)
  const [error, setError] = useState<string>("")

  const parseLengths = (input: string): number[] => {
    // Parse comma-separated, space-separated, or newline-separated numbers
    const cleaned = input.replace(/\s+/g, " ").trim()
    const parts = cleaned.split(/[,\s]+/)
    return parts
      .map(p => parseFloat(p))
      .filter(n => !isNaN(n) && n > 0)
  }

  const runCalculation = () => {
    try {
      setError("")
      const lengths = parseLengths(lengthsInput)
      
      if (lengths.length === 0) {
        setError("Please enter at least one valid tube length")
        return
      }

      const inputs = {
        lengths_mm: lengths,
        ...(showAdvanced ? {
          diameter_mm,
          width_m,
          gamma_Npm,
          eta_NsPm2,
          thetaTop_deg: thetaTop,
          thetaBottom_deg: thetaBottom,
          thetaLeft_deg: thetaLeft,
          thetaRight_deg: thetaRight,
        } : {})
      }

      const output = computeMicrofluidics(inputs)
      setResults(output)
    } catch (e: any) {
      setError(e?.message || "Calculation error")
      setResults(null)
    }
  }

  const loadPreset = (preset: string) => {
    switch (preset) {
      case "default":
        setLengthsInput("50, 132.5, 180.5, 40, 80, 120, 160, 200, 240, 280")
        break
      case "short":
        setLengthsInput("40, 50, 60, 70, 80")
        break
      case "medium":
        setLengthsInput("100, 120, 140, 160, 180, 200")
        break
      case "long":
        setLengthsInput("200, 240, 280, 320, 360")
        break
    }
  }

  const resetAdvanced = () => {
    setDiameter_mm(1.0)
    setWidth_m(0.001)
    setGamma_Npm(0.0722)
    setEta_NsPm2(0.904e-3)
    setThetaTop(0)
    setThetaBottom(0)
    setThetaLeft(0)
    setThetaRight(0)
  }

  const fmt = (n: number, decimals: number = 3) => {
    if (Math.abs(n) < 0.001 || Math.abs(n) > 1000) {
      return n.toExponential(decimals)
    }
    return n.toFixed(decimals)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Microfluidics Calculator</h2>
          <p className="text-muted-foreground max-w-3xl">
            Calculate capillary-driven flow parameters (pressure, flow rate, velocity, transit time) 
            for cylindrical microchannels. Default model: 1 mm-ID tube with PBS/water.
          </p>
        </div>
        <Badge>Active</Badge>
      </div>

      {/* Input Section */}
      <Card className="p-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label>Tube Lengths (mm)</Label>
              <Input
                value={lengthsInput}
                onChange={(e) => setLengthsInput(e.target.value)}
                placeholder="Enter comma-separated lengths, e.g., 50, 100, 150"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter one or more tube lengths in millimeters, separated by commas or spaces
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => loadPreset("default")}>
                Load Default Test Set
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadPreset("short")}>
                Short Tubes (40-80 mm)
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadPreset("medium")}>
                Medium Tubes (100-200 mm)
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadPreset("long")}>
                Long Tubes (200-360 mm)
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Override default parameters for custom scenarios (e.g., different fluids or tube geometries).
                Defaults reproduce PBS/water in 1 mm-ID cylindrical tubes with perfect wetting (θ = 0°).
              </p>
              <Button variant="outline" size="sm" onClick={resetAdvanced}>
                Reset to Defaults
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tube Diameter (mm)</Label>
                <Input type="number" value={diameter_mm} step="0.1" onChange={(e) => setDiameter_mm(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Channel Width w (m)</Label>
                <Input type="number" value={width_m} step="0.0001" onChange={(e) => setWidth_m(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Surface Tension γ (N/m)</Label>
                <Input type="number" value={gamma_Npm} step="0.001" onChange={(e) => setGamma_Npm(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Viscosity η (N·s/m²)</Label>
                <Input type="number" value={eta_NsPm2} step="0.0001" onChange={(e) => setEta_NsPm2(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>θ Top (degrees)</Label>
                <Input type="number" value={thetaTop} step="1" onChange={(e) => setThetaTop(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>θ Bottom (degrees)</Label>
                <Input type="number" value={thetaBottom} step="1" onChange={(e) => setThetaBottom(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>θ Left (degrees)</Label>
                <Input type="number" value={thetaLeft} step="1" onChange={(e) => setThetaLeft(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>θ Right (degrees)</Label>
                <Input type="number" value={thetaRight} step="1" onChange={(e) => setThetaRight(Number(e.target.value))} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={runCalculation}>Calculate Flow Parameters</Button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showAdvanced}
              onChange={(e) => setShowAdvanced(e.target.checked)}
              className="rounded"
            />
            Use advanced parameters
          </label>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">
            {error}
          </div>
        )}
      </Card>

      {/* Results Section */}
      {results && (
        <Card className="p-6 border-2 border-primary/30">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-foreground mb-2">Results</h3>
            <p className="text-sm text-muted-foreground">
              Calculated for {results.rows.length} tube length{results.rows.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Parameters Summary */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-semibold text-foreground mb-2">Parameters Used:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div>Diameter: {results.inputs.diameter_mm} mm</div>
              <div>γ: {results.inputs.gamma_Npm} N/m</div>
              <div>η: {results.inputs.eta_NsPm2} N·s/m²</div>
              <div>w: {results.inputs.width_m} m</div>
              <div>θ_top: {results.inputs.thetaTop_deg}°</div>
              <div>θ_bottom: {results.inputs.thetaBottom_deg}°</div>
              <div>θ_left: {results.inputs.thetaLeft_deg}°</div>
              <div>θ_right: {results.inputs.thetaRight_deg}°</div>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-semibold text-foreground">L (mm)</th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground">L (m)</th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground">P_cap (Pa)</th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground">Q (m³/s)</th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground">V (m/s)</th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground">T (s)</th>
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-3 px-2 font-mono">{row.L_mm}</td>
                    <td className="py-3 px-2 font-mono text-muted-foreground">{fmt(row.L_m, 4)}</td>
                    <td className="py-3 px-2 font-mono">{fmt(row.P_cap_Pa)}</td>
                    <td className="py-3 px-2 font-mono">{fmt(row.Q_m3_s)}</td>
                    <td className="py-3 px-2 font-mono">{fmt(row.V_m_s)}</td>
                    <td className="py-3 px-2 font-mono font-semibold text-primary">{fmt(row.T_s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Statistics */}
          {results.rows.length > 1 && (
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Min Transit Time"
                value={`${fmt(Math.min(...results.rows.map(r => r.T_s)))} s`}
              />
              <MetricCard
                label="Max Transit Time"
                value={`${fmt(Math.max(...results.rows.map(r => r.T_s)))} s`}
              />
              <MetricCard
                label="Total Time (sequential)"
                value={`${fmt(results.rows.reduce((sum, r) => sum + r.T_s, 0))} s`}
              />
              <MetricCard
                label="Avg Flow Rate"
                value={`${fmt(results.rows.reduce((sum, r) => sum + r.Q_m3_s, 0) / results.rows.length)} m³/s`}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-background rounded-lg border border-border">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-semibold text-foreground font-mono">{value}</div>
    </div>
  )
}
