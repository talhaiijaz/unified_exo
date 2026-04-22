"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { calculateSheet1 } from "@/lib/calc/rc"

export function RCCalculator() {
  const [f, setF] = useState(0.25)
  const [C, setC] = useState(9.6e-5)
  const [R, setR] = useState(98)
  const [Vfix, setVfix] = useState(1.65)
  const [Vin, setVin] = useState(0.3)
  const [Rf, setRf] = useState(10000)
  const [results, setResults] = useState<ReturnType<typeof calculateSheet1> | null>(null)

  const run = () => {
    setResults(calculateSheet1({ f, C, R, Vfix, Vin, Rf }))
  }

  const fmt = (x: number | null) => (x == null ? "-" : x.toExponential ? x.toExponential(3) : String(x))

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">RC Calculator (Sheet 1)</h2>
          <p className="text-muted-foreground">Parses core RC relationships and derived values.</p>
        </div>
        <Badge>Active</Badge>
      </div>

      <Card className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          <Field label="Frequency (Hz)" value={f} setValue={setF} />
          <Field label="Capacitance (F)" value={C} setValue={setC} />
          <Field label="Resistance (Ω)" value={R} setValue={setR} />
          <Field label="Vfix (V)" value={Vfix} setValue={setVfix} />
          <Field label="Vin (V)" value={Vin} setValue={setVin} />
          <Field label="Rf (Ω)" value={Rf} setValue={setRf} />
        </div>
        <div className="mt-6">
          <Button onClick={run}>Run</Button>
        </div>
      </Card>

        {results && (
          <Card className="p-6 border-2 border-primary/30">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Metric label="T" value={fmt(results.T)} />
              <Metric label="2πfC" value={fmt(results.two_pi_f_C)} />
              <Metric label="Xc" value={fmt(results.Xc)} />
              <Metric label="R^2 + Xc^2" value={fmt(results.R2_plus_Xc2)} />
              <Metric label="|Z|" value={fmt(results.Z)} />
              <Metric label="i" value={fmt(results.i)} />
              <Metric label="Vwork" value={fmt(results.Vwork)} />
              <Metric label="Vout" value={fmt(results.Vout)} />
              <Metric label="Vmax" value={fmt(results.Vmax)} />
              <Metric label="Vmin" value={fmt(results.Vmin)} />
              <Metric label="Amplitude" value={fmt(results.amplitude)} />
            </div>
          </Card>
        )}
    </div>
  )
}

function Field({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value} step="any" onChange={(e) => setValue(Number(e.target.value))} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-background rounded-lg border border-border">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  )
}
