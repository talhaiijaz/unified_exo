import { NextResponse } from 'next/server'
import { enableSystem, startLoop } from '@/lib/exo/state'

export async function POST(req: Request) {
  startLoop()
  const body = await req.json()
  enableSystem(!!body.enable)
  return NextResponse.json({ ok: true, enabled: !!body.enable })
}
