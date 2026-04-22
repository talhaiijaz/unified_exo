"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { calculateVx } from "@/lib/calc/rc"

export function VxPlotter() {
  const [Vmax, setVmax] = useState(1.0)
  const [Vmin, setVmin] = useState(-1.0)
  const [f, setF] = useState(0.25)
  const [res, setRes] = useState<ReturnType<typeof calculateVx> | null>(null)

  const run = () => setRes(calculateVx({ Vmax, Vmin, f }))

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Vx(t) Plotter</h2>
          <p className="text-muted-foreground">Generates Vx points across a unit interval.</p>
        </div>
        <Badge>Active</Badge>
      </div>

      <Card className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          <Field label="Vmax (V)" value={Vmax} setValue={setVmax} />
          <Field label="Vmin (V)" value={Vmin} setValue={setVmin} />
          <Field label="f (Hz)" value={f} setValue={setF} />
        </div>
        <div className="mt-6">
          <Button onClick={run}>Run</Button>
        </div>
      </Card>

      {res && (
        <Card className="p-6 border-2 border-primary/30">
          <div className="text-sm text-muted-foreground mb-2">Vpeak: {res.Vpeak.toExponential(3)} V</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1">t</th>
                <th className="text-left py-1">Vx</th>
              </tr>
            </thead>
            <tbody>
              {res.t.map((tv, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1">{tv}</td>
                  <td className="py-1">{res.vx[i].toExponential(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
