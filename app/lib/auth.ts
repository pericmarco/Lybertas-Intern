import 'server-only'
import { cookies } from 'next/headers'
import { createHash, timingSafeEqual } from 'crypto'
import { cache } from 'react'
import { decrypt } from './session'

export const NAMES = ['marco', 'tobi'] as const
export type Name = (typeof NAMES)[number]

function envPassword(name: Name): string | undefined {
  return name === 'marco' ? process.env.INTERN_PASSWORD_MARCO : process.env.INTERN_PASSWORD_TOBI
}

// Vergleich über SHA-256-Digests statt der Rohstrings: beide Digests sind immer
// exakt 32 Byte lang, dadurch wirft timingSafeEqual nie wegen Längenunterschied
// (der selbst schon ein Timing-Leck wäre) und der Vergleich bleibt konstant lang.
function constantTimeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a).digest()
  const digestB = createHash('sha256').update(b).digest()
  return timingSafeEqual(digestA, digestB)
}

export function checkCredentials(name: string, password: string): name is Name {
  if (!NAMES.includes(name as Name)) return false
  const expected = envPassword(name as Name)
  if (!expected) return false
  return constantTimeEqual(password, expected)
}

// DAL: liest und verifiziert die Session aus dem Cookie. Gibt null zurück statt
// zu redirecten — proxy.ts ist die erste Schranke, hier zusätzlich pro Server
// Action geprüft (Verteidigung in der Tiefe, wie in den Next.js-Docs empfohlen).
export const verifySession = cache(async (): Promise<{ name: Name } | null> => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)
  if (!session || !NAMES.includes(session.name as Name)) return null
  return { name: session.name as Name }
})
