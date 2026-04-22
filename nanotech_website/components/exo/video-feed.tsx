"use client"

import { useState } from "react"
import { getVideoFeedUrl } from "@/lib/exo/api"

export function VideoFeed({ clientId, className }: { clientId: string; className?: string }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg aspect-video ${className || ''}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No Video Feed</p>
          <p className="text-sm">Camera not connected or streaming</p>
          <button
            onClick={() => setError(false)}
            className="mt-2 text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-80"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden bg-black ${className || ''}`}>
      <img
        src={getVideoFeedUrl(clientId)}
        alt={`Live feed from ${clientId}`}
        className="w-full h-auto"
        onError={() => setError(true)}
      />
      <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        LIVE
      </div>
    </div>
  )
}
