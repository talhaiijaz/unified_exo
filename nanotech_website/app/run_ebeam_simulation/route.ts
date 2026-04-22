import { NextResponse } from "next/server"

function deriveShiftCsv(mask: number[][]): string {
  const rows = mask.length
  const cols = rows > 0 ? mask[0].length : 0
  const active: Array<[number, number]> = []
  for (let r = 0; r < rows; r++) {
    const row = mask[r] as number[]
    for (let c = 0; c < cols; c++) {
      const v = Number(row?.[c] ?? 0)
      if (v > 0) active.push([r, c])
    }
  }
  active.sort((a,b)=> a[0]-b[0] || a[1]-b[1])
  const moves: { shift: string; indices: number[] }[] = []
  const mapDir = (dr: number, dc: number): string => {
    if (dr === 0 && dc === 0) return "STAY"
    if (Math.abs(dc) >= Math.abs(dr)) return dc > 0 ? "RIGHT" : "LEFT"
    return dr > 0 ? "DOWN" : "UP"
  }
  const toIdx = (_r: number, c: number) => c
  if (active.length === 0) return "Shift,Activated CNT Indices\nSTAY,[]"
  let prev = active[0]
  let current = { shift: "STAY", indices: [toIdx(prev[0], prev[1])] }
  for (let i = 1; i < active.length; i++) {
    const cur = active[i]
    const shift = mapDir(cur[0]-prev[0], cur[1]-prev[1])
    if (shift === current.shift) current.indices.push(toIdx(cur[0], cur[1]))
    else { current.indices = Array.from(new Set(current.indices)); moves.push(current); current = { shift, indices: [toIdx(cur[0], cur[1])] } }
    prev = cur
  }
  current.indices = Array.from(new Set(current.indices))
  moves.push(current)
  const lines: string[] = ["Shift,Activated CNT Indices"]
  for (const m of moves) lines.push(`${m.shift},[${m.indices.join(", ")}]`)
  return lines.join("\n")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const mask = body?.mask
    if (!Array.isArray(mask)) return NextResponse.json({ status: "error", error: "No mask data provided" }, { status: 400 })
    const csv_data = deriveShiftCsv(mask as number[][])
    return NextResponse.json({ status: "success", csv_data })
  } catch (e: any) {
    return NextResponse.json({ status: "error", error: String(e?.message || e) }, { status: 500 })
  }
}
