import { NextResponse } from "next/server"

function getBackendUrl() {
  return (process.env.FIELD_EMISSIONS_BACKEND_URL || "").trim()
}

export async function GET() {
  const configured = !!getBackendUrl()
  return NextResponse.json({
    configured,
    // Clear operator guidance for bringing Stage 3 online.
    next_step: configured
      ? "Backend URL is configured."
      : "Set FIELD_EMISSIONS_BACKEND_URL in Vercel env vars and redeploy.",
  })
}

