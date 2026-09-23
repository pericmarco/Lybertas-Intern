import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/app/lib/session'

// Optimistic Check (Next.js-Empfehlung): nur das Cookie lesen, keine
// Datenbankabfrage hier. Jede Server Action prüft zusätzlich selbst
// (app/lib/auth.ts verifySession) — proxy.ts ist nicht die einzige Schranke.
const PUBLIC_PATHS = new Set(['/login'])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.has(pathname)

  const cookie = request.cookies.get('session')?.value
  const session = await decrypt(cookie)

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isPublic && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Öffentliche Dateien ohne Login-Prüfung: Tab-Icon und die (ohnehin frei verfügbaren) BKG-Gemeindegrenzen.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|gemeinden.topo.json).*)'],
}
