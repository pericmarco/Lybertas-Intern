'use client'

import { useRef, useTransition } from 'react'
import { addTodo, toggleTodo, deleteTodo } from '@/app/actions'

export type Todo = {
  id: string
  text: string
  done: boolean
  created_by: string | null
  created_at: string
}

export default function TodoList({ todos }: { todos: Todo[] }) {
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="card">
      <form
        className="todo-form"
        action={(formData) => {
          startTransition(() => addTodo(formData))
          formRef.current?.reset()
        }}
        ref={formRef}
      >
        <input name="text" placeholder="Neues Todo…" required autoComplete="off" />
        <button type="submit" className="btn primary">+</button>
      </form>

      <div className="todo-list">
        {todos.length === 0 && <p className="empty">Keine offenen Todos.</p>}
        {todos.map((t) => (
          <div key={t.id} className={`todo-item${t.done ? ' done' : ''}`}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={(e) => startTransition(() => toggleTodo(t.id, e.target.checked))}
            />
            <span>{t.text}</span>
            <button className="del" onClick={() => startTransition(() => deleteTodo(t.id))} aria-label="Löschen">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
