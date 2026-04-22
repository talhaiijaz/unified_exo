import { NextResponse } from 'next/server'
import { macro, startLoop } from '@/lib/exo/state'

export async function POST(req: Request) {
  startLoop()
  const body = await req.json()
  const name = String(body.name || '')
  const speed = Number(body.speed ?? 0.5)
  macro(name, speed)
  return NextResponse.json({ ok: true })
}
