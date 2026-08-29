import { NextResponse } from 'next/server'
import { createSession } from '@/lib/session'
import { verifyCredentials } from '@/lib/queries'
import type { Role } from '@/lib/types'

export async function POST(req: Request) {
  let body: { employeeId?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const employeeId = (body.employeeId ?? '').trim()
  const password = body.password ?? ''
  if (!employeeId || !password) {
    return NextResponse.json(
      { ok: false, error: 'Employee ID and password are required.' },
      { status: 400 },
    )
  }

  const result = await verifyCredentials(employeeId, password)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 })
  }

  const u = result.user
  await createSession({
    id: u.id,
    employeeId: u.employeeId,
    name: u.name,
    role: u.role as Role,
    district: u.district,
    state: u.state,
  })

  return NextResponse.json({
    ok: true,
    user: {
      id: u.id,
      employeeId: u.employeeId,
      name: u.name,
      role: u.role,
      district: u.district,
      state: u.state,
    },
  })
}
