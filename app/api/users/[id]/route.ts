import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { updateUser } from '@/lib/queries'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  let body: { active?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 })
  }

  const officer = await updateUser(id, { active: body.active })
  if (!officer) {
    return NextResponse.json({ ok: false, error: 'Officer not found.' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, officer })
}
