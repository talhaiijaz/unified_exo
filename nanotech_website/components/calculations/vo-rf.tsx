"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { calculateVoRf } from "@/lib/calc/rc"

export function VoRfExplorer() {
  const [f, setF] = useState(0.25)
  const [Vmax, setVmax] = useState(1.0)
  const [Vmin, setVmin] = useState(-1.0)
  const [R, setR] = useState(100)
  const [C, setC] = useState(1e-4)
  const [Rf, setRf] = useState(1000)
  const [t, setT] = useState(2)
  const [Vref, setVref] = useState(1.65)
  const [res, setRes] = useState<ReturnType<typeof calculateVoRf> | null>(null)

  const run = () => setRes(calculateVoRf({ f, Vmax, Vmin, R, C, Rf, t, Vref }))

  const fmt = (x: number) => x.toExponential(3)

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Vo & Rf Explorer</h2>
          <p className="text-muted-foreground">Triangle branches with derived currents and outputs.</p>
        </div>
        <Badge>Active</Badge>
      </div>

      <Card className="p-6">
        <div className="grid md:grid-cols-4 gap-6">
          <Field label="f (Hz)" value={f} setValue={setF} />
          <Field label="Vmax (V)" value={Vmax} setValue={setVmax} />
          <Field label="Vmin (V)" value={Vmin} setValue={setVmin} />
          <Field label="R (Ω)" value={R} setValue={setR} />
          <Field label="C (F)" value={C} setValue={setC} />
          <Field label="Rf (Ω)" value={Rf} setValue={setRf} />
          <Field label="t (s)" value={t} setValue={setT} />
          <Field label="Vref (V)" value={Vref} setValue={setVref} />
        </div>
        <div className="mt-6">
          <Button onClick={run}>Run</Button>
        </div>
      </Card>

      {res && (
        <Card className="p-6 border-2 border-primary/30">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Metric label="Vpeak" value={fmt(res.Vpeak)} />
            <Metric label="Xc" value={fmt(res.Xc)} />
            <Metric label="|Z|" value={fmt(res.Z)} />
            <Metric label="i_mag" value={fmt(res.i_mag)} />
            <Metric label="i_peak" value={fmt(res.i_peak)} />
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <BranchCard title="Down Branch" data={res.down} />
            <BranchCard title="Up Branch" data={res.up} />
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

function BranchCard({ title, data }: { title: string; data: { Vwork: number; i: number; Vo: number } }) {
  const fmt = (x: number) => x.toExponential(3)
  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Vwork" value={fmt(data.Vwork)} />
        <Metric label="i" value={fmt(data.i)} />
        <Metric label="Vo" value={fmt(data.Vo)} />
      </div>
    </Card>
  )
}
