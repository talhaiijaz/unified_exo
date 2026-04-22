import { NextResponse } from 'next/server'
import { estop, startLoop } from '@/lib/exo/state'

export async function POST(req: Request) {
  startLoop()
  const body = await req.json()
  const clear = !!body.clear
  estop(clear)
  return NextResponse.json({ ok: true, e_stop: !clear })
}
