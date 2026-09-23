import { verifySession } from '@/app/lib/auth'
import { db } from '@/app/lib/db'
import { logout } from '@/app/actions'
import TodoList, { type Todo } from '@/components/TodoList'
import KommunenKarte, { type Kommune } from '@/components/KommunenKarte'

export default async function Dashboard() {
  const session = await verifySession()
  const name = session?.name ?? ''

  const [{ data: todos }, { data: kommunen }] = await Promise.all([
    db().from('todos').select('*').order('done').order('created_at', { ascending: false }),
    db().from('kommunen').select('*').order('name'),
  ])

  return (
    <div className="page">
      <header className="top">
        <h1>Lybertas — Intern</h1>
        <div className="whoami">
          <span>{name === 'marco' ? 'Marco' : name === 'tobi' ? 'Tobi' : ''}</span>
          <form action={logout}>
            <button type="submit" className="btn link">Abmelden</button>
          </form>
        </div>
      </header>

      <section>
        <h2>Todos</h2>
        <TodoList todos={(todos ?? []) as Todo[]} />
      </section>

      <section>
        <h2>Kommunen</h2>
        <KommunenKarte kommunen={(kommunen ?? []) as Kommune[]} />
      </section>
    </div>
  )
}
