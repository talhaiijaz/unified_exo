import { NextResponse } from "next/server"

// Stores the last received parameters (in-memory per server instance)
let lastParams: any = {
  wafer_dim: [800, 600],
  cnt_grid_shape: [10, 10],
  cnt_unit_dim: [10, 10],
  display: false,
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = body?.params || {}

    // Update in-memory snapshot (no-op defaults preserved)
    if (Array.isArray(params.wafer_dim)) lastParams.wafer_dim = params.wafer_dim
    if (Array.isArray(params.cnt_grid_shape)) lastParams.cnt_grid_shape = params.cnt_grid_shape
    if (Array.isArray(params.cnt_unit_dim)) lastParams.cnt_unit_dim = params.cnt_unit_dim
    if (typeof params.display === 'boolean') lastParams.display = params.display

    return NextResponse.json({ status: "success", params: lastParams })
  } catch (e: any) {
    return NextResponse.json({ status: "error", error: String(e?.message || e) }, { status: 500 })
  }
}
