import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { createUser, type NewOfficerPayload } from '@/lib/queries'
import type { Role } from '@/lib/types'

const VALID_ROLES: Role[] = ['inspector', 'supervisor', 'admin']

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  let payload: NewOfficerPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!payload.name?.trim() || !payload.employeeId?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Name and Employee ID are required.' },
      { status: 400 },
    )
  }
  if (!VALID_ROLES.includes(payload.role)) {
    return NextResponse.json({ ok: false, error: 'Invalid role.' }, { status: 400 })
  }

  try {
    const officer = await createUser({
      ...payload,
      employeeId: payload.employeeId.trim(),
      district: payload.district?.trim() || '—',
      password: payload.password?.trim() || 'demo',
    })
    return NextResponse.json({ ok: true, officer })
  } catch (e) {
    console.error('Failed to create officer', e)
    return NextResponse.json(
      { ok: false, error: 'An officer with that Employee ID already exists.' },
      { status: 409 },
    )
  }
}
