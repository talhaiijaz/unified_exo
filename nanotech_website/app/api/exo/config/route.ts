import { NextResponse } from 'next/server'
import { getConfig, startLoop } from '@/lib/exo/state'

export async function GET() {
  startLoop()
  return NextResponse.json(getConfig())
}
