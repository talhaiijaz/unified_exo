"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Activity } from "lucide-react"

interface LmpPoint {
  bias: number
  current: number
}

const LMP_API_URL = process.env.NEXT_PUBLIC_LMP_API_URL

export function LMP91000Tool() {
  const [points, setPoints] = useState<LmpPoint[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pstatIndex, setPstatIndex] = useState("0")

  const stats = useMemo(() => {
    if (!points.length) {
      return null
    }

    const biases = points.map((p) => p.bias)
    const currents = points.map((p) => p.current)

    return {
      count: points.length,
      minBias: Math.min(...biases),
      maxBias: Math.max(...biases),
      minCurrent: Math.min(...currents),
      maxCurrent: Math.max(...currents),
    }
  }, [points])

  const handleRun = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsRunning(true)
    setPoints([])

    if (!LMP_API_URL) {
      setError("LMP backend URL is not configured. Set NEXT_PUBLIC_LMP_API_URL in your environment.")
      setIsRunning(false)
      return
    }

    try {
      const response = await fetch(`${LMP_API_URL}/api/lmp/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pstatIndex: Number(pstatIndex) || 0,
        }),
      })

      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}`)
      }

      const data = await response.json()

      const rawPoints = Array.isArray(data.points) ? data.points : []
      const parsedPoints: LmpPoint[] = rawPoints
        .map((p: any) => ({
          bias: Number(p.bias),
          current: Number(p.current),
        }))
        .filter((p) => Number.isFinite(p.bias) && Number.isFinite(p.current))

      if (!parsedPoints.length) {
        throw new Error("Backend responded without any points.")
      }

      setPoints(parsedPoints)
    } catch (err: any) {
      setError(err?.message || "Failed to run LMP91000 test.")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 border border-primary/20 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Hardware-backed measurement</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">LMP91000 Potentiostat</h2>
          <p className="text-sm text-muted-foreground">
            Trigger a cyclic voltammetry scan on the Teensy+LMP91000 setup and stream bias-current pairs into the portal.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline">
            {LMP_API_URL ? "Backend URL configured" : "Backend URL missing"}
          </Badge>
          <span className="text-[11px] text-muted-foreground max-w-xs text-right">
            {LMP_API_URL || "Set NEXT_PUBLIC_LMP_API_URL to the base URL of the LMP backend (e.g. http://pi.local:5000)."}
          </span>
        </div>
      </div>
      {!LMP_API_URL && (
        <p className="text-xs font-semibold text-destructive">
          Backend integration pending: configure NEXT_PUBLIC_LMP_API_URL and start the LMP bridge service to enable scans.
        </p>
      )}
      <Card className="p-4 md:p-6">
        <form onSubmit={handleRun} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="pstat-index">Potentiostat index</Label>
              <Input
                id="pstat-index"
                type="number"
                min={0}
                max={3}
                value={pstatIndex}
                onChange={(event) => setPstatIndex(event.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Zero-based index into the firmware {`pstats[]`} array.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    isRunning ? "bg-emerald-400 animate-pulse" : points.length ? "bg-emerald-400" : "bg-muted-foreground/40"
                  }`}
                />
                <span className="text-muted-foreground">
                  {isRunning ? "Running scan on hardware" : points.length ? "Last scan completed" : "Idle"}
                </span>
              </div>
            </div>
            <div className="flex items-end justify-start md:justify-end">
              <Button type="submit" disabled={isRunning}>
                {isRunning ? "Running" : "Run CV scan"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-2 inline-flex w-full items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </Card>

      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Latest measurement</h3>
            <p className="text-sm text-muted-foreground">
              Bias vs current pairs returned by the LMP backend. Integrate a chart here in the next phase.
            </p>
          </div>
          {stats && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-xs text-muted-foreground">
              <span>Points</span>
              <span className="font-medium text-foreground">{stats.count}</span>
              <span>Bias range</span>
              <span className="font-medium text-foreground">
                {stats.minBias.toFixed(2)} to {stats.maxBias.toFixed(2)}
              </span>
              <span>Current range</span>
              <span className="font-medium text-foreground">
                {stats.minCurrent.toExponential(2)} to {stats.maxCurrent.toExponential(2)} A
              </span>
            </div>
          )}
        </div>

        {points.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-t border-border">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Bias</th>
                  <th className="py-2 pr-4">Current (A)</th>
                </tr>
              </thead>
              <tbody>
                {points.slice(0, 64).map((point, index) => (
                  <tr key={`${point.bias}-${point.current}-${index}`} className="border-t border-border/60">
                    <td className="py-1.5 pr-4">{index + 1}</td>
                    <td className="py-1.5 pr-4">{point.bias.toFixed(2)}</td>
                    <td className="py-1.5 pr-4">{point.current.toExponential(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {points.length > 64 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Showing first 64 points of {points.length}.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No measurement has been run yet. Configure the backend URL and run a scan to see data here.
          </p>
        )}
      </Card>
    </div>
  )
}
