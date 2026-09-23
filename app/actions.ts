'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkCredentials, verifySession } from '@/app/lib/auth'
import { createSession, deleteSession } from '@/app/lib/session'
import { db } from '@/app/lib/db'

export type LoginState = { error?: string } | undefined

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const name = String(formData.get('name') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!checkCredentials(name, password)) {
    return { error: 'Name oder Passwort falsch.' }
  }

  await createSession(name)
  redirect('/')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}

// ── Todos ──────────────────────────────────────────────

export async function addTodo(formData: FormData) {
  const session = await verifySession()
  if (!session) return
  const text = String(formData.get('text') ?? '').trim()
  if (!text) return
  await db().from('todos').insert({ text, created_by: session.name })
  revalidatePath('/')
}

export async function toggleTodo(id: string, done: boolean) {
  const session = await verifySession()
  if (!session) return
  await db().from('todos').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', id)
  revalidatePath('/')
}

export async function deleteTodo(id: string) {
  const session = await verifySession()
  if (!session) return
  await db().from('todos').delete().eq('id', id)
  revalidatePath('/')
}

// ── Kommunen ───────────────────────────────────────────

const STATUSES = ['nicht_kontaktiert', 'angeschrieben', 'termin_vereinbart', 'gespraech_gefuehrt', 'kunde', 'abgesagt']

export type KommuneInput = {
  ags: string
  name: string
  status: string
  notes: string
  contact_date: string | null
  appointment_date: string | null
}

export async function saveKommune(input: KommuneInput): Promise<{ error?: string }> {
  const session = await verifySession()
  if (!session) return { error: 'Nicht angemeldet.' }
  if (!/^\d{8}$/.test(input.ags) || !STATUSES.includes(input.status)) return { error: 'Ungültige Eingabe.' }

  const { error } = await db().from('kommunen_status').upsert({
    ags: input.ags,
    name: input.name,
    status: input.status,
    notes: input.notes.trim() || null,
    contact_date: input.contact_date || null,
    appointment_date: input.appointment_date || null,
    updated_by: session.name,
    updated_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidatePath('/')
  return {}
}

export async function resetKommune(ags: string): Promise<{ error?: string }> {
  const session = await verifySession()
  if (!session) return { error: 'Nicht angemeldet.' }
  const { error } = await db().from('kommunen_status').delete().eq('ags', ags)
  if (error) return { error: error.message }
  revalidatePath('/')
  return {}
}
