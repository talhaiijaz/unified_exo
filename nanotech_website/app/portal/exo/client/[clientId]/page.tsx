"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getClient, getCommandHistory, type PiClient } from "@/lib/exo/api"
import { VideoFeed } from "@/components/exo/video-feed"
import { DeviceControl } from "@/components/exo/device-control"

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const [client, setClient] = useState<PiClient | null>(null)
  const [telemetry, setTelemetry] = useState<Record<string, any>>({})
  const [commands, setCommands] = useState<any[]>([])
  const [tab, setTab] = useState<"devices" | "video" | "telemetry" | "commands">("devices")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!clientId) return
    const load = async () => {
      try {
        const c = await getClient(clientId)
        setClient(c)
        const h = await getCommandHistory(clientId, 20)
        setCommands(h)
      } catch (err: any) {
        setError(err.message)
      }
    }
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [clientId])

  // WebSocket telemetry
  useEffect(() => {
    if (!clientId) return
    let ws: WebSocket | null = null
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      ws = new WebSocket(`${protocol}//${window.location.host}/api/exo/clients/${clientId}/telemetry/ws`)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setTelemetry(data.readings || data)
        } catch {}
      }
    } catch {}
    return () => { ws?.close() }
  }, [clientId])

  if (error) {
    return (
      <div className="p-8">
        <Link href="/portal/exo" className="text-primary hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 p-4 rounded-lg">
          Error: {error}
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-8">
        <Link href="/portal/exo" className="text-primary hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
        <p className="text-muted-foreground">Loading client {clientId}...</p>
      </div>
    )
  }

  const tabs = [
    { key: "devices", label: "Devices" },
    { key: "video", label: "Video" },
    { key: "telemetry", label: "Telemetry" },
    { key: "commands", label: "Commands" },
  ] as const

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/portal/exo" className="text-sm text-primary hover:underline">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">{client.client_id}</h1>
          <p className="text-sm text-muted-foreground">
            Session: {client.session_id?.slice(0, 8)}...
            {" | "}
            {client.sim_mode ? "Simulation Mode" : "Hardware Mode"}
            {" | "}
            {client.device_manifest?.length || 0} devices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Connected
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "devices" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {client.device_manifest && client.device_manifest.length > 0 ? (
            client.device_manifest.map((dev: any) => (
              <DeviceControl
                key={dev.id}
                clientId={clientId}
                deviceType={dev.type}
                deviceId={dev.id}
              />
            ))
          ) : (
            <p className="text-muted-foreground col-span-3">No devices registered by this Pi agent.</p>
          )}
        </div>
      )}

      {tab === "video" && (
        <div className="max-w-3xl">
          <VideoFeed clientId={clientId} className="aspect-video" />
        </div>
      )}

      {tab === "telemetry" && (
        <div className="space-y-4">
          {Object.keys(telemetry).length > 0 ? (
            Object.entries(telemetry).map(([deviceId, data]: [string, any]) => (
              <div key={deviceId} className="border rounded-lg p-4 bg-card">
                <h3 className="font-semibold mb-2 capitalize">{deviceId}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {typeof data === "object" && data !== null ? (
                    Object.entries(data).map(([key, value]: [string, any]) => (
                      <div key={key} className="bg-muted rounded p-3">
                        <p className="text-xs text-muted-foreground">{key}</p>
                        <p className="text-lg font-mono font-semibold">
                          {typeof value === "number" ? value.toFixed(2) : String(value)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm">{String(data)}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No telemetry data received yet. Waiting for Pi agent...</p>
          )}
        </div>
      )}

      {tab === "commands" && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Command</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {commands.length > 0 ? (
                commands.map((cmd: any) => (
                  <tr key={cmd.msg_id} className="border-t">
                    <td className="p-3 font-mono text-xs">{cmd.command}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        cmd.result?.payload?.status === "ok"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : cmd.ack ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-muted"
                      }`}>
                        {cmd.result?.payload?.status || (cmd.ack ? "acked" : "sent")}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(cmd.sent_at * 1000).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No commands sent yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
