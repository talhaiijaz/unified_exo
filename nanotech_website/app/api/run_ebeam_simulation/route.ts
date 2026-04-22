import { NextResponse } from "next/server"

// Returns CSV shaped like the original: two columns
// "Shift,Activated CNT Indices" with many rows.
// We derive a simple directional grouping from the provided mask.

function deriveShiftCsv(mask: number[][]): string {
  const rows = mask.length
  const cols = rows > 0 ? mask[0].length : 0

  // Collect all active coordinates (row, col)
  const active: Array<[number, number]> = []
  for (let r = 0; r < rows; r++) {
    const row = mask[r] as number[]
    for (let c = 0; c < cols; c++) {
      const v = Number(row?.[c] ?? 0)
      if (v > 0) active.push([r, c])
    }
  }
  // Sort to get a deterministic sweep order
  active.sort((a,b)=> a[0]-b[0] || a[1]-b[1])

  const moves: { shift: string; indices: number[] }[] = []
  const mapDir = (dr: number, dc: number): string => {
    if (dr === 0 && dc === 0) return "STAY"
    if (Math.abs(dc) >= Math.abs(dr)) return dc > 0 ? "RIGHT" : "LEFT"
    return dr > 0 ? "DOWN" : "UP"
  }

  const toIdx = (r: number, c: number) => c // column index 0..cols-1 (matches 0..19 look)

  if (active.length === 0) {
    return "Shift,Activated CNT Indices\nSTAY,[]"
  }

  let prev = active[0]
  let current = { shift: "STAY", indices: [toIdx(prev[0], prev[1])] }
  for (let i = 1; i < active.length; i++) {
    const cur = active[i]
    const shift = mapDir(cur[0]-prev[0], cur[1]-prev[1])
    const lastShift = current.shift
    if (shift === lastShift) {
      current.indices.push(toIdx(cur[0], cur[1]))
    } else {
      // push previous group (unique indices, pretty order)
      current.indices = Array.from(new Set(current.indices))
      moves.push(current)
      current = { shift, indices: [toIdx(cur[0], cur[1])] }
    }
    prev = cur
  }
  current.indices = Array.from(new Set(current.indices))
  moves.push(current)

  const lines: string[] = ["Shift,Activated CNT Indices"]
  for (const m of moves) {
    const pretty = `[${m.indices.join(", ")}]`
    lines.push(`${m.shift},${pretty}`)
  }
  return lines.join("\n")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const mask = body?.mask
    if (!Array.isArray(mask)) {
      return NextResponse.json({ status: "error", error: "No mask data provided" }, { status: 400 })
    }
    const csv_data = deriveShiftCsv(mask as number[][])
    return NextResponse.json({ status: "success", csv_data })
  } catch (e: any) {
    return NextResponse.json({ status: "error", error: String(e?.message || e) }, { status: 500 })
  }
}
