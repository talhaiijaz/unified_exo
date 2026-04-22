"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { calculateCnt } from "@/lib/calc/cnt"

export function CNTCalculator() {
  const [r, setR] = useState<number>(5e-9)
  const [h, setH] = useState<number>(2.5e-4)
  const [x, setX] = useState<number>(3e-6)
  const [y, setY] = useState<number>(2.54e-2)
  const [error, setError] = useState<string>("")
  const [results, setResults] = useState<ReturnType<typeof calculateCnt> | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const run = () => {
    try {
      setIsProcessing(true)
      setError("")
      const res = calculateCnt({ r, h, x, y })
      setResults(res)
    } catch (e: any) {
      setError(e?.message || "Calculation error")
      setResults(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const fmt = (n: number) => n.toExponential(3)

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">CNT Capacitance Calculator</h2>
          <p className="text-muted-foreground">Calculate surface areas, capacitance and energy for CNT arrays.</p>
        </div>
        <Badge>Active</Badge>
      </div>

      <Card className="p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label>CNT Radius (m)</Label>
            <Input type="number" value={r} onChange={(e) => setR(Number(e.target.value))} step="any" />
          </div>
          <div className="space-y-2">
            <Label>CNT Length (m)</Label>
            <Input type="number" value={h} onChange={(e) => setH(Number(e.target.value))} step="any" />
          </div>
          <div className="space-y-2">
            <Label>Base Width (m)</Label>
            <Input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} step="any" />
          </div>
          <div className="space-y-2">
            <Label>Base Length (m)</Label>
            <Input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} step="any" />
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={run} disabled={isProcessing} className="gap-2">
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Calculating...
              </>
            ) : (
              <>Run Calculation</>
            )}
          </Button>
          {error && <div className="text-sm text-red-400 mt-3">{error}</div>}
        </div>
      </Card>

      {results && (
        <Card className="p-6 border-2 border-primary/30">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Metric label="CNT Surface Area" value={`${fmt(results.cnt_surface_area)} m²`} />
            <Metric label="Base Area" value={`${fmt(results.base_area)} m²`} />
            <Metric label="Number of CNTs" value={`${Math.round(results.num_cnt).toLocaleString()}`} />
            <Metric label="Total Surface Area" value={`${fmt(results.total_surface_area)} m²`} />
            <Metric label="Capacitance (Pair)" value={`${fmt(results.c_pair)} F`} />
            <Metric label="Capacitance (Chip)" value={`${fmt(results.c_chip)} F`} />
            <Metric label="Energy (Chip)" value={`${fmt(results.energy_chip)} J`} />
            <Metric label="Energy (Wh)" value={`${fmt(results.wh)} Wh`} />
            <Metric label="Energy (mAh equiv.)" value={`${fmt(results.mah)} mAh`} />
          </div>
        </Card>
      )}
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
