"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const BACKEND_NOTE =
  "Arduino Control and Hardware Control require a Raspberry Pi backend and connected lab hardware. Until configured, these pages run in demo/limited mode."

export function FieldEmissionsTool() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [iframeHeight, setIframeHeight] = useState<number>(980)
  const [stage3Configured, setStage3Configured] = useState(false)
  const [stage3Running, setStage3Running] = useState(false)
  const [stage3Result, setStage3Result] = useState<Record<string, unknown> | null>(null)
  const [emitters, setEmitters] = useState<number[]>([0, 0, 0, 0, 0])

  useEffect(() => {
    void fetch("/api/field-emissions/config")
      .then(async (res) => {
        const data = (await res.json()) as { configured?: boolean }
        setStage3Configured(!!data.configured)
      })
      .catch(() => setStage3Configured(false))
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const applyEmbeddedThemeAndNotice = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) return

      const isDark =
        document.documentElement.classList.contains("dark") ||
        (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)

      const root = doc.documentElement
      root.style.setProperty("--bg", isDark ? "#0b1020" : "#f7f9fc")
      root.style.setProperty("--panel", isDark ? "#121a2f" : "#ffffff")
      root.style.setProperty("--panel-2", isDark ? "#0f1530" : "#fbfcff")
      root.style.setProperty("--text", isDark ? "#e8ecf6" : "#0c1326")
      root.style.setProperty("--muted", isDark ? "#a9b3c9" : "#4a5678")
      root.style.setProperty("--border", isDark ? "#1e2844" : "#e5e9f3")

      let style = doc.getElementById("codex-stage1-contrast") as HTMLStyleElement | null
      if (!style) {
        style = doc.createElement("style")
        style.id = "codex-stage1-contrast"
        doc.head.appendChild(style)
      }
      style.textContent = `
        body { background: var(--bg) !important; color: var(--text) !important; }
        .site-header { background: var(--panel) !important; border-color: var(--border) !important; }
        .tab { background: var(--panel) !important; color: var(--text) !important; border: 1px solid var(--border) !important; }
        .tab.active { background: var(--panel-2) !important; }
        .card, .soft, .param, .tile, .pix { background: var(--panel-2) !important; color: var(--text) !important; border-color: var(--border) !important; }
        .mini, .badge, .hint, .help { color: var(--muted) !important; }
        #status, #derived, pre#status, pre.output, .output, pre.log {
          background: var(--panel) !important;
          color: var(--text) !important;
          border-color: var(--border) !important;
        }
        input, select, textarea {
          background: var(--panel) !important;
          color: var(--text) !important;
          border: 1px solid var(--border) !important;
        }
      `

      let note = doc.getElementById("codex-backend-note")
      if (!note) {
        note = doc.createElement("div")
        note.id = "codex-backend-note"
        note.setAttribute(
          "style",
          [
            "margin:12px auto 8px auto",
            "max-width:1040px",
            "padding:10px 12px",
            "border-radius:10px",
            "border:1px solid #d97706",
            "background:#fef3c7",
            "color:#78350f",
            "font-size:13px",
            "line-height:1.4",
          ].join(";")
        )
        note.textContent = BACKEND_NOTE
        const header = doc.querySelector("header")
        if (header?.parentNode) header.parentNode.insertBefore(note, header.nextSibling)
        else doc.body.insertBefore(note, doc.body.firstChild)
      }
    }

    const updateHeight = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) return
      const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
      if (h && Math.abs(h - iframeHeight) > 10) setIframeHeight(h)
    }

    const onLoad = () => {
      applyEmbeddedThemeAndNotice()
      updateHeight()
    }

    iframe.addEventListener("load", onLoad)
    const id = window.setInterval(() => {
      applyEmbeddedThemeAndNotice()
      updateHeight()
    }, 900)
    onLoad()

    const observer = new MutationObserver(() => applyEmbeddedThemeAndNotice())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    return () => {
      iframe.removeEventListener("load", onLoad)
      window.clearInterval(id)
      observer.disconnect()
    }
  }, [iframeHeight])

  async function runStage3Backend() {
    setStage3Running(true)
    setStage3Result(null)
    try {
      const embeddedWin = iframeRef.current?.contentWindow as
        | (Window & {
            __fieldEmissionsGetGrid?: () => number[][]
            __fieldEmissionsGetParams?: () => Record<string, number>
          })
        | null

      const matrix = embeddedWin?.__fieldEmissionsGetGrid?.() ?? []
      const params = embeddedWin?.__fieldEmissionsGetParams?.() ?? {}

      const res = await fetch("/api/field-emissions/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matrix,
          params,
        }),
      })
      const data = (await res.json()) as Record<string, unknown>
      setStage3Result(data)
    } catch (err: any) {
      setStage3Result({ error: String(err?.message || err) })
    } finally {
      setStage3Running(false)
    }
  }

  async function toggleEmitter(index: number, state01: 0 | 1) {
    try {
      const res = await fetch("/api/field-emissions/toggle-emitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, state: state01 }),
      })
      const data = (await res.json()) as Record<string, unknown>
      setStage3Result(data)
      if (res.ok) {
        setEmitters((prev) => {
          const next = prev.slice()
          next[index - 1] = state01
          return next
        })
      }
    } catch (err: any) {
      setStage3Result({ error: String(err?.message || err) })
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Field Emissions GUI</h2>
          <p className="text-muted-foreground">
            Original imported implementation is active. React-native migration is intentionally deferred for now.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="default">Stage 1 Active</Badge>
          <Badge variant={stage3Configured ? "default" : "outline"}>
            {stage3Configured ? "Stage 3 Configured" : "Stage 3 Not Configured"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="original" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="original">Original App (Stage 1)</TabsTrigger>
          <TabsTrigger value="hardware">Hardware Bridge (Stage 3)</TabsTrigger>
        </TabsList>

        <TabsContent value="original" className="mt-6 space-y-4">
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            {BACKEND_NOTE}
          </div>
          <Card className="relative overflow-hidden">
            <iframe
              ref={iframeRef}
              src="/field_emissions/index.html"
              className="w-full"
              style={{ height: `${Math.max(760, Math.min(2600, iframeHeight))}px` }}
              title="Field Emissions Original App"
            />
          </Card>
        </TabsContent>

        <TabsContent value="hardware" className="mt-6">
          <Card className="p-5 space-y-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Raspberry Pi Backend Bridge</h3>
              <p className="text-sm text-muted-foreground">
                This bridge is ready, but your backend URL is currently not configured in Vercel.
              </p>
              {!stage3Configured && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  Next step: set <code>FIELD_EMISSIONS_BACKEND_URL</code> in Vercel env vars, then redeploy.
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void runStage3Backend()} disabled={stage3Running}>
                {stage3Running ? "Sending..." : "Run On Backend (/run)"}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Emitter Controls (/toggle_emitter)</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="rounded-md border border-border p-3">
                    <div className="text-sm font-medium mb-2">Emitter {idx}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={emitters[idx - 1] ? "default" : "outline"}>{emitters[idx - 1] ? "ON" : "OFF"}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void toggleEmitter(idx, 1)}>
                        On
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void toggleEmitter(idx, 0)}>
                        Off
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Stage 3 Response</h4>
              <pre className="rounded-md border border-border bg-muted/20 p-3 text-xs whitespace-pre-wrap h-56 overflow-auto">
                {stage3Result ? JSON.stringify(stage3Result, null, 2) : "No Stage 3 response yet"}
              </pre>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
