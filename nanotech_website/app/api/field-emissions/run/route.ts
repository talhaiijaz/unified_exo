import { NextResponse } from "next/server"

function getBackendUrl() {
  return (process.env.FIELD_EMISSIONS_BACKEND_URL || "").trim()
}

export async function POST(req: Request) {
  const base = getBackendUrl()
  if (!base) {
    return NextResponse.json(
      {
        error: "Stage 3 backend is not configured.",
        next_step: "Set FIELD_EMISSIONS_BACKEND_URL in Vercel env vars and redeploy.",
      },
      { status: 503 }
    )
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Proxy contract:
  // frontend sends { matrix, params } and this route forwards it to the Pi backend /run.
  // If your Pi server expects a different payload, adapt it here instead of changing the UI.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const upstream = await fetch(`${base}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    })
    const text = await upstream.text()
    const isJson = (upstream.headers.get("content-type") || "").includes("application/json")
    const body = isJson ? JSON.parse(text || "{}") : { raw: text }
    return NextResponse.json(body, { status: upstream.status })
  } catch (err: any) {
    const isAbort = err?.name === "AbortError"
    return NextResponse.json(
      {
        error: isAbort ? "Upstream /run timed out after 60s." : String(err?.message || err),
        backend: base,
      },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeout)
  }
}

