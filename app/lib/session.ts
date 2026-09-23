import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Erst beim Aufruf lesen, nicht beim Laden des Moduls: Next.js lädt die Module
// schon beim Build, und dort soll eine fehlende Variable den Build nicht abbrechen.
function secretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET fehlt')
  return new TextEncoder().encode(secret)
}

export type SessionPayload = { name: string }

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey())
}

export async function decrypt(session: string | undefined = ''): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, secretKey(), { algorithms: ['HS256'] })
    if (typeof payload.name !== 'string') return null
    return { name: payload.name }
  } catch {
    return null
  }
}

export async function createSession(name: string) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ name })
  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
