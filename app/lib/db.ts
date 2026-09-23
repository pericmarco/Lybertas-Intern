import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-Role-Client: umgeht RLS komplett, nur serverseitig verwendet, nie an
// den Browser ausgeliefert. Die Tabellen selbst haben RLS aktiviert und keine
// Policies für anon/authenticated — ohne diesen Key kommt niemand an die Daten,
// auch nicht über die öffentliche Supabase-REST-API.
export function db() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY fehlen')
  return createClient(url, key, { auth: { persistSession: false } })
}
