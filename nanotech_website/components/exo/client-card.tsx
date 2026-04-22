"use client"

import Link from "next/link"
import { type PiClient } from "@/lib/exo/api"

export function ClientCard({ client }: { client: PiClient }) {
  const ago = Math.round((Date.now() / 1000 - client.last_heartbeat))
  const isStale = ago > 15

  return (
    <Link href={`/portal/exo/client/${client.client_id}`}>
      <div className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">{client.client_id}</h3>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isStale ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isStale ? 'bg-red-500' : 'bg-green-500'}`} />
            {isStale ? 'Stale' : 'Online'}
          </span>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Devices:</span>
            <span>{client.device_manifest?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Video:</span>
            <span>{client.video_connected ? 'Active' : 'Off'}</span>
          </div>
          <div className="flex justify-between">
            <span>Telemetry:</span>
            <span>{client.telemetry_connected ? 'Active' : 'Off'}</span>
          </div>
          <div className="flex justify-between">
            <span>Mode:</span>
            <span>{client.sim_mode ? 'Simulation' : 'Hardware'}</span>
          </div>
          <div className="flex justify-between">
            <span>Heartbeat:</span>
            <span>{ago}s ago</span>
          </div>
        </div>

        {client.device_manifest && client.device_manifest.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {client.device_manifest.map((d: any) => (
              <span key={d.id} className="text-xs px-2 py-0.5 rounded bg-muted">
                {d.type}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
