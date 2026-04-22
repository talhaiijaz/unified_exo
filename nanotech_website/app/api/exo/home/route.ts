import { NextResponse } from 'next/server'
import { homeAll, startLoop } from '@/lib/exo/state'

export async function POST() {
  startLoop()
  homeAll()
  return NextResponse.json({ ok: true })
}
