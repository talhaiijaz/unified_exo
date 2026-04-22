"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { listClients, type PiClient } from "@/lib/exo/api"

interface SimDevice {
  type: string
  id: string
  state: Record<string, any>
}

const DEVICE_VISUALS: Record<string, (state: Record<string, any>) => React.ReactNode> = {
  motor: (s) => (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-16 h-16 border-4 border-primary rounded-full flex items-center justify-center"
        style={{ transform: `rotate(${(s.step_count || 0) * 3.6}deg)`, transition: "transform 0.3s" }}
      >
        <div className="w-1 h-6 bg-primary rounded" />
      </div>
      <span className="text-xs text-muted-foreground">Steps: {s.step_count || 0}</span>
    </div>
  ),

  oled: (s) => (
    <div className="w-40 h-20 bg-black rounded border border-zinc-600 flex items-center justify-center p-2">
      <span className="text-green-400 text-xs font-mono text-center leading-tight">
        {s.display_text || "—"}
      </span>
    </div>
  ),

  camera: (s) => (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-12 h-12 rounded-full border-4 ${s.active ? "border-red-500" : "border-muted"} flex items-center justify-center`}>
        <div className={`w-6 h-6 rounded-full ${s.active ? "bg-red-500 animate-pulse" : "bg-muted"}`} />
      </div>
      <span className="text-xs text-muted-foreground">
        {s.recording ? "REC" : s.active ? "Live" : "Off"}
        {s.frame_count ? ` (${s.frame_count} frames)` : ""}
      </span>
    </div>
  ),

  temperature: (s) => {
    const temp = s.temperature_c ?? 25
    const pct = Math.min(100, Math.max(0, ((temp - 15) / 30) * 100))
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-8 h-24 bg-muted rounded-full overflow-hidden border">
          <div
            className="absolute bottom-0 w-full rounded-full transition-all duration-500"
            style={{
              height: `${pct}%`,
              background: temp > 37 ? "#ef4444" : temp > 30 ? "#f59e0b" : "#3b82f6",
            }}
          />
        </div>
        <span className="text-lg font-mono font-bold">{temp.toFixed(1)}°C</span>
        {s.target_c != null && (
          <span className="text-xs text-muted-foreground">Target: {s.target_c}°C</span>
        )}
      </div>
    )
  },

  gyroscope: (s) => {
    const ax = s.accel_x ?? 0
    const ay = s.accel_y ?? 0
    const gz = s.gyro_z ?? 0
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-20 h-20 border-2 border-primary rounded-lg flex items-center justify-center bg-muted/50"
          style={{
            transform: `rotateX(${ay * 5}deg) rotateY(${ax * 5}deg) rotateZ(${gz}deg)`,
            transition: "transform 0.2s",
          }}
        >
          <div className="text-xs font-mono">
            <div>X:{ax.toFixed(1)}</div>
            <div>Y:{ay.toFixed(1)}</div>
            <div>Z:{(s.accel_z ?? 9.8).toFixed(1)}</div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{s.calibrated ? "Calibrated" : "Not calibrated"}</span>
      </div>
    )
  },

  ultrasonic: (s) => (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {s.active && (
          <>
            <div className="absolute w-full h-full rounded-full border-2 border-blue-400 animate-ping opacity-30" />
            <div className="absolute w-3/4 h-3/4 rounded-full border-2 border-blue-400 animate-ping opacity-50" style={{ animationDelay: "0.2s" }} />
          </>
        )}
        <div className={`w-8 h-8 rounded-full ${s.active ? "bg-blue-500" : "bg-muted"}`} />
      </div>
      <span className="text-xs text-muted-foreground">
        {s.active ? `${(s.frequency_hz || 0) / 1000}kHz` : "Off"}
      </span>
    </div>
  ),

  vibration: (s) => {
    const intensity = s.intensity || 0
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className={`w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold ${intensity > 0 ? "animate-bounce" : ""}`}
          style={{ animationDuration: intensity > 160 ? "0.15s" : "0.3s" }}
        >
          {intensity}
        </div>
        <span className="text-xs text-muted-foreground">
          {intensity > 0 ? `Intensity: ${intensity}/255` : "Off"}
        </span>
      </div>
    )
  },

  tens: (s) => (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {s.active && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-full h-full animate-pulse">
              <path d="M20 5 L22 15 L28 12 L23 20 L30 18 L22 25 L25 35 L18 25 L12 30 L17 20 L10 22 L18 15 Z" fill="#eab308" />
            </svg>
          </div>
        )}
        <span className="text-lg font-bold z-10">{s.active ? "ON" : "OFF"}</span>
      </div>
      <span className="text-xs text-muted-foreground">
        {s.active ? `${s.intensity}/${s.max_intensity} @ ${s.frequency_hz}Hz` : "Inactive"}
      </span>
    </div>
  ),
}

export default function SimulatorPage() {
  const [clients, setClients] = useState<PiClient[]>([])
  const [telemetryData, setTelemetryData] = useState<Record<string, Record<string, any>>>({})
  const [serverOnline, setServerOnline] = useState(false)

  useEffect(() => {
    const poll = async () => {
      try {
        const c = await listClients()
        setClients(c)
        setServerOnline(true)

        // Fetch telemetry for each client
        for (const client of c) {
          try {
            const res = await fetch(`/api/exo/clients/${client.client_id}/telemetry`)
            if (res.ok) {
              const data = await res.json()
              setTelemetryData((prev) => ({
                ...prev,
                [client.client_id]: data.readings || data,
              }))
            }
          } catch {}
        }
      } catch {
        setServerOnline(false)
      }
    }
    poll()
    const interval = setInterval(poll, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/portal/exo" className="text-sm text-primary hover:underline">&larr; Back to Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">Simulator — Software Twin</h1>
          <p className="text-sm text-muted-foreground">
            Virtual indicators for all connected devices. Updates in real-time from telemetry.
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          serverOnline ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
        }`}>
          {serverOnline ? "Live" : "Offline"}
        </span>
      </div>

      {clients.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">No Pi agents connected</p>
          <p className="text-sm">Start a simulated agent:</p>
          <code className="block mt-2 bg-muted px-4 py-2 rounded text-sm">
            EXO_SIM_MODE=1 EXO_HOST=127.0.0.1 python3 pi_agent/agent.py
          </code>
        </div>
      ) : (
        <div className="space-y-8">
          {clients.map((client) => {
            const deviceTelemetry = telemetryData[client.client_id] || {}
            return (
              <div key={client.client_id} className="border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold">{client.client_id}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {client.sim_mode ? "Simulation" : "Hardware"}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {(client.device_manifest || []).map((dev: any) => {
                    const deviceState = deviceTelemetry[dev.id] || {}
                    const Visual = DEVICE_VISUALS[dev.type]
                    return (
                      <div key={dev.id} className="border rounded-lg p-4 flex flex-col items-center gap-3 bg-background">
                        <h3 className="font-medium capitalize text-sm">{dev.type}</h3>
                        <p className="text-xs text-muted-foreground">{dev.id}</p>
                        {Visual ? Visual(deviceState) : (
                          <div className="text-xs text-muted-foreground">
                            <pre className="max-w-[200px] overflow-auto">{JSON.stringify(deviceState, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
