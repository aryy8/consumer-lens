import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AuthUser } from './types'

const COOKIE_NAME = 'cl_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set. Add it to .env.local.')
  return new TextEncoder().encode(secret)
}

/** Read and verify the session cookie. Returns the user or null (never throws). */
export async function getSessionUser(): Promise<AuthUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      employeeId: payload.employeeId as string,
      name: payload.name as string,
      role: payload.role as AuthUser['role'],
      district: payload.district as string,
      state: payload.state as string,
    }
  } catch {
    return null
  }
}

/** Sign a session JWT and set it as an HTTP-only cookie. */
export async function createSession(user: AuthUser): Promise<void> {
  const token = await new SignJWT({
    employeeId: user.employeeId,
    name: user.name,
    role: user.role,
    district: user.district,
    state: user.state,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())

  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** For server components: return the user or redirect to /login. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

/** For admin-only routes/server components. */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser()
  if (user.role !== 'admin') redirect('/dashboard')
  return user
}
