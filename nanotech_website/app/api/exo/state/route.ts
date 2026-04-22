import { NextResponse } from 'next/server'
import { getState, startLoop } from '@/lib/exo/state'

export async function GET() {
  startLoop()
  return NextResponse.json(getState())
}
