"use client"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function PumpPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 container mx-auto px-4 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Syringe Pump Control</h1>
          <div className="ml-auto text-sm font-medium text-red-500">
            Waiting for backend: /api/pump/* endpoints not configured yet.
          </div>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Run Controls (UI scaffold)</h2>
          <p className="text-sm text-muted-foreground">
            This section will let you configure volume (mL), flow rate (mL/min), and direction, then start a run
            via the /api/pump/run endpoint.
          </p>
          <div className="grid md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <div className="text-sm font-medium">Target Volume (mL)</div>
              <div className="h-10 rounded-md border border-dashed border-border flex items-center px-3 text-xs text-muted-foreground">
                Input field placeholder
              </div>
              <div className="text-sm font-medium mt-4">Flow Rate (mL/min)</div>
              <div className="h-10 rounded-md border border-dashed border-border flex items-center px-3 text-xs text-muted-foreground">
                Slider + numeric input placeholder
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-sm font-medium">Direction</div>
              <div className="h-10 rounded-md border border-dashed border-border flex items-center px-3 text-xs text-muted-foreground mb-4">
                Forward / Reverse toggle placeholder
              </div>
              <div className="flex gap-3">
                <Button size="sm">
                  Start Run
                </Button>
                <Button size="sm" variant="outline">
                  Stop
                </Button>
                <Button size="sm" variant="outline">
                  Home
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Pump Status (UI scaffold)</h2>
          <p className="text-sm text-muted-foreground">
            This section will display live status from /api/pump/state, including connection, current position, target,
            flow rate, and any error codes.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-md border border-dashed border-border p-3 text-muted-foreground">
              Connection &amp; backend health placeholder
            </div>
            <div className="rounded-md border border-dashed border-border p-3 text-muted-foreground">
              Position / target / flow telemetry placeholder
            </div>
            <div className="rounded-md border border-dashed border-border p-3 text-muted-foreground">
              Recent events / errors placeholder
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-2">
          <h2 className="text-lg font-semibold">Backend wiring</h2>
          <p className="text-sm text-muted-foreground">
            Once the Raspberry Pi syringe pump backend is running and the /api/pump/* routes are implemented, this page
            will be fully interactive. See the SYRINGE_PUMP_RPI_SETUP.md guide at the repo root for wiring and
            deployment details.
          </p>
        </Card>
      </div>
    </main>
  )
}
