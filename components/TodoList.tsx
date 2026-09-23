'use client'

import { useMemo, useOptimistic, useRef, useTransition } from 'react'
import { addTodo, toggleTodo, deleteTodo, setTodoPriority } from '@/app/actions'

export type Priority = 'dringend' | 'wichtig' | 'spaeter'

export type Todo = {
  id: string
  text: string
  done: boolean
  priority?: Priority | null
  created_by: string | null
  created_at: string
}

const PRIORITY_LABEL: Record<Priority, string> = { dringend: 'Dringend', wichtig: 'Wichtig', spaeter: 'Hat Zeit' }
const PRIORITY_ORDER = Object.keys(PRIORITY_LABEL) as Priority[]
// Sortierung innerhalb einer Gruppe: dringend, wichtig, nicht eingeordnet, hat Zeit.
const RANK: Record<string, number> = { dringend: 0, wichtig: 1, keine: 2, spaeter: 3 }

const FALLBACK_GROUP = 'Allgemein'

// „Bereich: Text" → Gruppe „Bereich". Kurzes Präfix, damit ein normaler Satz
// mit Doppelpunkt nicht versehentlich zur Gruppe wird.
function splitGroup(text: string): { group: string; label: string } {
  const i = text.indexOf(': ')
  if (i > 0 && i <= 20) return { group: text.slice(0, i), label: text.slice(i + 2) }
  return { group: FALLBACK_GROUP, label: text }
}

type Group = { name: string; items: (Todo & { label: string })[]; open: number; urgent: number }

function groupTodos(todos: Todo[]): Group[] {
  const sorted = [...todos].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const groups = new Map<string, Group>()
  for (const t of sorted) {
    const { group, label } = splitGroup(t.text)
    if (!groups.has(group)) groups.set(group, { name: group, items: [], open: 0, urgent: 0 })
    const g = groups.get(group)!
    g.items.push({ ...t, label })
    if (!t.done) g.open++
    if (!t.done && t.priority === 'dringend') g.urgent++
  }
  for (const g of groups.values()) {
    g.items.sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        RANK[a.priority ?? 'keine'] - RANK[b.priority ?? 'keine'] ||
        a.created_at.localeCompare(b.created_at)
    )
  }
  return [...groups.values()]
}

type Change =
  | { type: 'add'; todo: Todo }
  | { type: 'toggle'; id: string; done: boolean }
  | { type: 'priority'; id: string; priority: Priority | null }
  | { type: 'delete'; id: string }

export default function TodoList({ todos }: { todos: Todo[] }) {
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  // Sofort anzeigen, Server im Hintergrund — nach der Antwort gelten wieder die Serverdaten.
  const [items, apply] = useOptimistic(todos, (current: Todo[], c: Change) => {
    if (c.type === 'add') return [...current, c.todo]
    if (c.type === 'toggle') return current.map((t) => (t.id === c.id ? { ...t, done: c.done } : t))
    if (c.type === 'priority') return current.map((t) => (t.id === c.id ? { ...t, priority: c.priority } : t))
    return current.filter((t) => t.id !== c.id)
  })
  const groups = useMemo(() => groupTodos(items), [items])
  const openTotal = items.filter((t) => !t.done).length
  const urgentTotal = items.filter((t) => !t.done && t.priority === 'dringend').length

  function changePriority(id: string, value: string) {
    const priority = (value || null) as Priority | null
    startTransition(async () => {
      apply({ type: 'priority', id, priority })
      const res = await setTodoPriority(id, priority)
      if (res.error) alert(`Dringlichkeit konnte nicht gespeichert werden: ${res.error}`)
    })
  }

  return (
    <div className="card">
      <form
        className="todo-form"
        ref={formRef}
        action={async (formData) => {
          const text = String(formData.get('text') ?? '').trim()
          if (!text) return
          apply({ type: 'add', todo: { id: `neu-${Date.now()}`, text, done: false, priority: null, created_by: null, created_at: new Date().toISOString() } })
          formRef.current?.reset()
          await addTodo(formData)
        }}
      >
        <input name="text" placeholder="Neues Todo… (z. B. „UG: Notartermin“)" required autoComplete="off" />
        <button type="submit" className="btn primary">+</button>
      </form>

      <div className="prio-legend">
        {PRIORITY_ORDER.map((p) => (
          <span key={p}>
            <span className={`prio-dot prio-${p}`} />
            {PRIORITY_LABEL[p]}
          </span>
        ))}
        <span className="prio-legend-hint">Punkt vor dem Todo antippen zum Ändern</span>
      </div>

      {items.length === 0 && <p className="empty">Keine Todos.</p>}
      {items.length > 0 && (
        <p className="todo-summary">
          {openTotal} offen
          {urgentTotal > 0 && <strong className="urgent"> · {urgentTotal} dringend</strong>} · {items.length - openTotal} erledigt
        </p>
      )}

      {groups.map((g) => (
        <div key={g.name} className="todo-group">
          <h3 className="todo-group-title">
            {g.name}{' '}
            <span>
              {g.open > 0 ? `${g.open} offen` : 'alles erledigt'}
              {g.urgent > 0 && <strong className="urgent"> · {g.urgent} dringend</strong>}
            </span>
          </h3>
          <div className="todo-list">
            {g.items.map((t) => {
              const p = t.priority ?? null
              return (
                <div key={t.id} className={`todo-item${t.done ? ' done' : ''}`}>
                  <label className={`prio-dot prio-${p ?? 'keine'}`} title={`Dringlichkeit: ${p ? PRIORITY_LABEL[p] : 'nicht eingeordnet'}`}>
                    <select aria-label="Dringlichkeit" value={p ?? ''} onChange={(e) => changePriority(t.id, e.target.value)}>
                      <option value="">Nicht eingeordnet</option>
                      {PRIORITY_ORDER.map((o) => (
                        <option key={o} value={o}>
                          {PRIORITY_LABEL[o]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={(e) => {
                      const done = e.target.checked
                      startTransition(async () => {
                        apply({ type: 'toggle', id: t.id, done })
                        await toggleTodo(t.id, done)
                      })
                    }}
                  />
                  <span>{t.label}</span>
                  <button
                    className="del"
                    aria-label="Löschen"
                    onClick={() =>
                      startTransition(async () => {
                        apply({ type: 'delete', id: t.id })
                        await deleteTodo(t.id)
                      })
                    }
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
