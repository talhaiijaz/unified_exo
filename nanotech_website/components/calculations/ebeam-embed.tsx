"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function EBeamEmbed() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [height, setHeight] = useState<number>(800)

  useEffect(() => {
    const update = () => {
      const iframe = iframeRef.current
      if (!iframe) return
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (!doc) return
        const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
        if (h && Math.abs(h - height) > 10) setHeight(h)
      } catch (_) {
        /* ignore cross-origin issues (should be same-origin) */
      }
    }

    const on = () => {
      update()
      const id = window.setInterval(update, 800)
      return () => window.clearInterval(id)
    }

    const cleanup = on()
    window.addEventListener("resize", update)
    return () => {
      cleanup()
      window.removeEventListener("resize", update)
    }
  }, [height])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const applyTheme = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) return

      const isDark = document.documentElement.classList.contains("dark") ||
        (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      const bg = isDark ? "#020617" : "#ffffff"
      const fg = isDark ? "#e5e7eb" : "#020617"

      doc.documentElement.style.backgroundColor = bg
      doc.body.style.backgroundColor = bg
      doc.body.style.color = fg
    }

    iframe.addEventListener("load", applyTheme)
    applyTheme()

    const target = document.documentElement
    const observer = new MutationObserver(() => applyTheme())
    observer.observe(target, { attributes: true, attributeFilter: ["class"] })

    return () => {
      iframe.removeEventListener("load", applyTheme)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Electron Beam Lithography</h2>
          <p className="text-muted-foreground">Embedded static UI served from the app. Use Update Parameters, draw, then Run Simulation.</p>
        </div>
        <Badge variant="secondary">Preview</Badge>
      </div>

      <Card className="relative overflow-hidden">
        <iframe
          ref={iframeRef}
          src="/ebeam_gui/index.html"
          className="w-full"
          style={{ height: `${Math.max(600, Math.min(1600, height))}px` }}
          title="E-Beam UI"
        />
      </Card>
    </div>
  )
}
