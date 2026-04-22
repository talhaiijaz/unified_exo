"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { calculateCovid } from "@/lib/calc/covid"

export function CovidSimulator() {
  const [params, setParams] = useState({
    epsilon_r: 78.49,
    z: 1,
    V_zeta: 0.05,
    C0: 10000,
    freq: 100000,
    freq2: 10000,
    r_CNT: 5e-9,
    h_CNT: 1e-4,
    chip_L: 1e-3,
    chip_W: 1e-3,
    gap_d1: 2e-8,
    gap_d2: 2e-8,
    er_DNA: 8,
    L_DNA: 2e-9,
    R_fixed: 1e5,
  })

  const [results, setResults] = useState<Record<string, string> | null>(null)

  const run = () => setResults(calculateCovid(params as any))

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">COVID Detection</h2>
          <p className="text-muted-foreground">EDL and Helmholtz layers with branch comparisons.</p>
        </div>
        <Badge>Active</Badge>
      </div>

      <Card className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(params).map(([k, v]) => (
            <Field
              key={k}
              label={k}
              value={v}
              setValue={(nv) => setParams((p) => ({ ...p, [k]: nv }))}
            />
          ))}
        </div>
        <div className="mt-6"><Button onClick={run}>Run</Button></div>
      </Card>

      {results && (
        <Card className="p-6 border-2 border-primary/30 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1 pr-4">Quantity</th>
                <th className="text-left py-1">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(results).map(([k, v]) => (
                <tr key={k} className="border-t border-border">
                  <td className="py-1 pr-4">{k}</td>
                  <td className="py-1 font-mono">{v}</td>
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
