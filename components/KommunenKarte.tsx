'use client'

import { useState, useTransition, type MouseEvent } from 'react'
import { addKommune, updateKommune, deleteKommune } from '@/app/actions'

export type KommuneStatus =
  | 'nicht_kontaktiert'
  | 'angeschrieben'
  | 'termin_vereinbart'
  | 'gespraech_gefuehrt'
  | 'kunde'
  | 'abgesagt'

export type Kommune = {
  id: string
  name: string
  status: KommuneStatus
  pos_x: number
  pos_y: number
  notes: string | null
  contact_date: string | null
  appointment_date: string | null
}

const STATUS_LABEL: Record<KommuneStatus, string> = {
  nicht_kontaktiert: 'Noch nicht kontaktiert',
  angeschrieben: 'Angeschrieben',
  termin_vereinbart: 'Termin vereinbart',
  gespraech_gefuehrt: 'Gespräch geführt',
  kunde: 'Kunde',
  abgesagt: 'Abgesagt',
}
const STATUS_ORDER = Object.keys(STATUS_LABEL) as KommuneStatus[]

export default function KommunenKarte({ kommunen }: { kommunen: Kommune[] }) {
  const [, startTransition] = useTransition()
  const [placing, setPlacing] = useState(false)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [pendingName, setPendingName] = useState('')
  const [selected, setSelected] = useState<Kommune | null>(null)

  function handleMapClick(e: MouseEvent<HTMLDivElement>) {
    if (!placing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setPendingPos({ x, y })
  }

  function submitNewKommune() {
    if (!pendingPos || !pendingName.trim()) return
    startTransition(() => addKommune({ name: pendingName.trim(), posX: pendingPos.x, posY: pendingPos.y }))
    setPendingPos(null)
    setPendingName('')
    setPlacing(false)
  }

  return (
    <div className="card">
      <div className="legend">
        {STATUS_ORDER.map((s) => (
          <span key={s}>
            <span className="dot" style={{ background: `var(--status-${s})` }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <div className="map-toolbar">
        {placing ? (
          <span className="map-hint">Klick auf die Karte, um eine Kommune zu platzieren…</span>
        ) : (
          <span />
        )}
        <button className="btn" onClick={() => { setPlacing((p) => !p); setPendingPos(null) }}>
          {placing ? 'Abbrechen' : '+ Kommune hinzufügen'}
        </button>
      </div>

      <div className={`map-wrap${placing ? ' placing' : ''}`} onClick={handleMapClick}>
        <img src="/germany.svg" alt="Deutschlandkarte" draggable={false} />
        {kommunen.map((k) => (
          <button
            key={k.id}
            className="pin"
            style={{
              left: `${k.pos_x * 100}%`,
              top: `${k.pos_y * 100}%`,
              background: `var(--status-${k.status})`,
            }}
            title={`${k.name} — ${STATUS_LABEL[k.status]}`}
            onClick={(e) => {
              e.stopPropagation()
              setSelected(k)
            }}
          />
        ))}
        {pendingPos && (
          <span
            className="pin"
            style={{ left: `${pendingPos.x * 100}%`, top: `${pendingPos.y * 100}%`, background: 'var(--accent)' }}
          />
        )}
      </div>
      <p className="map-attribution">Kartenumriss: svg-maps.com (CC BY 4.0)</p>

      {pendingPos && (
        <div className="overlay" onClick={() => setPendingPos(null)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <h3>Neue Kommune</h3>
            <div className="field">
              <label htmlFor="new-kommune-name">Name</label>
              <input
                id="new-kommune-name"
                autoFocus
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitNewKommune()}
              />
            </div>
            <div className="panel-actions">
              <button className="btn link" onClick={() => setPendingPos(null)}>Abbrechen</button>
              <button className="btn primary" onClick={submitNewKommune}>Anlegen</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <DetailPanel
          kommune={selected}
          onClose={() => setSelected(null)}
          onSaved={(patch) => {
            startTransition(() => updateKommune(selected.id, patch))
            setSelected(null)
          }}
          onDeleted={() => {
            startTransition(() => deleteKommune(selected.id))
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

function DetailPanel({
  kommune,
  onClose,
  onSaved,
  onDeleted,
}: {
  kommune: Kommune
  onClose: () => void
  onSaved: (patch: { status: KommuneStatus; notes: string; contact_date: string | null; appointment_date: string | null }) => void
  onDeleted: () => void
}) {
  const [status, setStatus] = useState<KommuneStatus>(kommune.status)
  const [notes, setNotes] = useState(kommune.notes ?? '')
  const [contactDate, setContactDate] = useState(kommune.contact_date ?? '')
  const [appointmentDate, setAppointmentDate] = useState(kommune.appointment_date ?? '')

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <h3>{kommune.name}</h3>

        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as KommuneStatus)}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="contact_date">Kontaktiert am</label>
          <input id="contact_date" type="date" value={contactDate} onChange={(e) => setContactDate(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="appointment_date">Termin am</label>
          <input id="appointment_date" type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="notes">Notizen</label>
          <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="panel-actions">
          <button className="btn danger" onClick={() => { if (confirm(`${kommune.name} wirklich löschen?`)) onDeleted() }}>
            Löschen
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn link" onClick={onClose}>Abbrechen</button>
            <button
              className="btn primary"
              onClick={() =>
                onSaved({
                  status,
                  notes,
                  contact_date: contactDate || null,
                  appointment_date: appointmentDate || null,
                })
              }
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
