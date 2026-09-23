'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined)

  return (
    <main className="login-wrap">
      <form action={formAction} className="login-card card">
        <h1>Lybertas — Intern</h1>
        <div className="field">
          <label htmlFor="name">Wer bist du?</label>
          <select id="name" name="name" required defaultValue="">
            <option value="" disabled>Auswählen…</option>
            <option value="marco">Marco</option>
            <option value="tobi">Tobi</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="password">Passwort</label>
          <input id="password" name="password" type="password" required autoFocus />
        </div>
        {state?.error && <p className="error">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn primary">
          {pending ? 'Prüfe…' : 'Anmelden'}
        </button>
      </form>
    </main>
  )
}
