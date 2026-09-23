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

export async function addKommune(input: { name: string; posX: number; posY: number }) {
  const session = await verifySession()
  if (!session) return
  const name = input.name.trim()
  if (!name) return
  await db().from('kommunen').insert({ name, pos_x: input.posX, pos_y: input.posY })
  revalidatePath('/')
}

export async function updateKommune(
  id: string,
  patch: { status?: string; notes?: string; contact_date?: string | null; appointment_date?: string | null }
) {
  const session = await verifySession()
  if (!session) return
  await db().from('kommunen').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/')
}

export async function deleteKommune(id: string) {
  const session = await verifySession()
  if (!session) return
  await db().from('kommunen').delete().eq('id', id)
  revalidatePath('/')
}
