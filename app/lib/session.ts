import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.SESSION_SECRET
if (!secretKey) throw new Error('SESSION_SECRET fehlt')
const encodedKey = new TextEncoder().encode(secretKey)

export type SessionPayload = { name: string }

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = ''): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, encodedKey, { algorithms: ['HS256'] })
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
