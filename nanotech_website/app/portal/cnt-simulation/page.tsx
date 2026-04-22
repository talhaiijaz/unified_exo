"use client"

import Link from "next/link"
import { Navigation } from "@/components/navigation"

export default function CntSimulationPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <div className="pt-20 px-6 py-3 border-b bg-card/50 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/portal" className="text-sm text-primary hover:underline">
            &larr; Back to Portal
          </Link>
          <h1 className="text-xl font-bold mt-1">CNT Nanosensor Simulation</h1>
          <p className="text-sm text-muted-foreground">
            Theoretical physics simulator by Tyler Wang · v1.0 + CapImpedance + SimRC + NanoLam
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/simulations/cnt-nanosensor.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
          >
            Open in New Tab
          </a>
        </div>
      </div>

      <div className="flex-1 relative">
        <iframe
          src="/simulations/cnt-nanosensor.html"
          className="w-full h-full border-0 absolute inset-0"
          title="CNT Nanosensor Unified Simulation"
          sandbox="allow-scripts allow-same-origin allow-downloads"
        />
      </div>
    </main>
  )
}
