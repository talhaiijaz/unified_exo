import { NextResponse } from 'next/server'
import { stop, startLoop } from '@/lib/exo/state'

export async function POST(req: Request) {
  startLoop()
  const body = await req.json()
  const joint = (body.joint ?? 'all') as any
  stop(joint)
  return NextResponse.json({ ok: true })
}
