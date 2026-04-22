import { NextResponse } from 'next/server'
import { command, startLoop } from '@/lib/exo/state'

export async function POST(req: Request) {
  startLoop()
  const body = await req.json()
  const joint = String(body.joint || '') as any
  const direction = parseInt(String(body.direction ?? 0), 10) as -1|0|1
  const speed = Number(body.speed ?? 0)
  if (![ -1, 0, 1 ].includes(direction)) return NextResponse.json({ error: 'direction must be -1, 0, or +1' }, { status: 400 })
  command(joint, direction, speed)
  return NextResponse.json({ ok: true })
}
