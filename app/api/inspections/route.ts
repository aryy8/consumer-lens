import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { createInspection, type NewInspectionPayload } from '@/lib/queries'

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let payload: NewInspectionPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!payload.productName || !payload.category || !Array.isArray(payload.fields)) {
    return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 })
  }

  try {
    const inspection = await createInspection(user, payload)
    return NextResponse.json({ ok: true, inspection })
  } catch (e) {
    console.error('Failed to create inspection', e)
    return NextResponse.json({ ok: false, error: (e as Error)?.message || 'Failed to save the inspection.' }, { status: 500 })
  }
}
