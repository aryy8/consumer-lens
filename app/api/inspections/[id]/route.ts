import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { deleteInspection, getInspectionById } from '@/lib/queries'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const inspection = await getInspectionById(id)
  if (!inspection) {
    return NextResponse.json({ ok: false, error: 'Inspection not found.' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, inspection })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await deleteInspection(id, user)
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.error === 'Inspection not found.' ? 404 : 403 },
    )
  }

  return NextResponse.json({ ok: true })
}

