import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-Role-Client: umgeht RLS komplett, nur serverseitig verwendet, nie an
// den Browser ausgeliefert. Die Tabellen selbst haben RLS aktiviert und keine
// Policies für anon/authenticated — ohne diesen Key kommt niemand an die Daten,
// auch nicht über die öffentliche Supabase-REST-API.
//
// Zuerst die Namen, die die Vercel↔Supabase-Integration selbst setzt und aktuell
// hält (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY); von Hand gesetzte
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY nur als Rückfall.
export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase-URL oder Secret Key fehlt')
  return createClient(url, key, { auth: { persistSession: false } })
}
