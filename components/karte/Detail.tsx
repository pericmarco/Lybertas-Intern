'use client'

import { useState } from 'react'
import type { KommuneInput } from '@/app/actions'
import {
  STATUS_LABEL,
  STATUS_ORDER,
  auswahlKey,
  einwohner,
  mailAdressen,
  verbundMitArtikel,
  verbundTitel,
  type Auswahl,
  type Kontakt,
  type KommuneStatus,
  type KommuneStatusRow,
  type MapData,
} from './daten'

export default function Detail({
  data,
  auswahl,
  rowByKey,
  onWechsel,
  onSave,
  onReset,
  onClose,
}: {
  data: MapData
  auswahl: Auswahl
  rowByKey: Map<string, KommuneStatusRow>
  onWechsel: (a: Auswahl) => void
  onSave: (input: KommuneInput) => void
  onReset: (key: string) => void
  onClose: () => void
}) {
  const gem = auswahl.ags ? data.byAgs.get(auswahl.ags) : undefined
  const verbKey = auswahl.ebene === 'verbund' ? auswahl.key : gem?.v
  const verb = verbKey ? data.verbuende.get(verbKey) : undefined
  const key = auswahlKey(auswahl)
  const row = rowByKey.get(key)
  const eigene = gem ? data.eigeneKontakte(gem.a) : []
  const verbKontakt = verb ? data.verbundKontakt(verb.key) : null
  const aufVerbund = auswahl.ebene === 'verbund'

  const titel = aufVerbund ? (verb ? verbundTitel(verb) : key) : gem?.n ?? key
  const name = aufVerbund ? titel : gem?.n ?? key

  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <h3>{titel}</h3>
          <p>
            {aufVerbund && verb ? `${verb.c} Gemeinden · ${verb.k}` : gem ? `${gem.b} · ${gem.k}` : ''}
            <br />
            {einwohner(aufVerbund ? verb?.e : gem?.e)}
          </p>
        </div>
        <button className="btn link" onClick={onClose} aria-label="Schließen">✕</button>
      </div>

      {gem && verb && (
        <div className="ebene-tabs" role="tablist" aria-label="Ebene">
          <button role="tab" aria-selected={!aufVerbund} className={!aufVerbund ? 'active' : ''} onClick={() => onWechsel({ ebene: 'gemeinde', ags: gem.a })}>
            Gemeinde
          </button>
          <button role="tab" aria-selected={aufVerbund} className={aufVerbund ? 'active' : ''} onClick={() => onWechsel({ ebene: 'verbund', key: verb.key, ags: gem.a })}>
            {verb.t} · {verb.c} Gem.
          </button>
        </div>
      )}

      <div className="kontakte">
        <h4>Zuständige Verwaltung</h4>
        {aufVerbund ? (
          verbKontakt ? <KontaktKarte k={verbKontakt} /> : <p className="kontakt-leer">Keine Anschrift im amtlichen Verzeichnis.</p>
        ) : eigene.length > 0 ? (
          <>
            {eigene.map((k, i) => (
              <KontaktKarte key={i} k={k} />
            ))}
            {verb && <p className="kontakt-hinweis">Gehört außerdem {verbundMitArtikel(verb, 'dat')}, siehe Reiter oben.</p>}
          </>
        ) : verbKontakt ? (
          <>
            <p className="kontakt-hinweis">Keine eigene Verwaltung, zuständig ist {verb ? verbundMitArtikel(verb, 'nom') : 'der Verbund'}:</p>
            <KontaktKarte k={verbKontakt} />
          </>
        ) : (
          <p className="kontakt-leer">Keine Anschrift im amtlichen Verzeichnis.</p>
        )}
      </div>

      <StatusFormular
        key={`${auswahl.ebene}-${key}`}
        row={row}
        onSave={(felder) => onSave({ ags: key, ebene: auswahl.ebene, name, ...felder })}
        onReset={() => onReset(key)}
        name={titel}
      />
    </div>
  )
}

function KontaktKarte({ k }: { k: Kontakt }) {
  const [kopiert, setKopiert] = useState<string | null>(null)
  const adressen = k.mail ? mailAdressen(k.mail) : []
  return (
    <div className="kontakt">
      <strong>{k.sitz}</strong>
      <span>{k.anschrift}</span>
      {adressen.length > 0 ? (
        adressen.map((m) => (
          <div key={m} className="kontakt-mail">
            <a href={`mailto:${m}`}>{m}</a>
            <button
              className="btn link"
              onClick={async () => {
                await navigator.clipboard.writeText(m)
                setKopiert(m)
                setTimeout(() => setKopiert(null), 1500)
              }}
            >
              {kopiert === m ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
        ))
      ) : (
        <span className="kontakt-leer">Keine E-Mail im amtlichen Verzeichnis</span>
      )}
    </div>
  )
}

function StatusFormular({
  row,
  name,
  onSave,
  onReset,
}: {
  row: KommuneStatusRow | undefined
  name: string
  onSave: (felder: Omit<KommuneInput, 'ags' | 'ebene' | 'name'>) => void
  onReset: () => void
}) {
  const [status, setStatus] = useState<KommuneStatus>(row?.status ?? 'nicht_kontaktiert')
  const [notes, setNotes] = useState(row?.notes ?? '')
  const [contactDate, setContactDate] = useState(row?.contact_date ?? '')
  const [appointmentDate, setAppointmentDate] = useState(row?.appointment_date ?? '')

  return (
    <>
      {!row && <p className="detail-hint">Noch nicht erfasst.</p>}
      <div className="status-picker" role="radiogroup" aria-label="Status">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={status === s}
            className={`status-chip${status === s ? ' active' : ''}`}
            onClick={() => setStatus(s)}
          >
            <span className="dot" style={{ background: `var(--status-${s})` }} />
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="date-row">
        <div className="field">
          <label htmlFor="contact_date">Kontaktiert am</label>
          <input id="contact_date" type="date" value={contactDate} onChange={(e) => setContactDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="appointment_date">Termin am</label>
          <input id="appointment_date" type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="notes">Notizen</label>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="panel-actions">
        {row ? (
          <button className="btn danger" onClick={() => confirm(`${name} von der Karte entfernen?`) && onReset()}>
            Entfernen
          </button>
        ) : (
          <span />
        )}
        <button
          className="btn primary"
          onClick={() =>
            onSave({ status, notes, contact_date: contactDate || null, appointment_date: appointmentDate || null })
          }
        >
          Speichern
        </button>
      </div>
      {row?.updated_by && (
        <p className="detail-meta">
          Zuletzt geändert von {row.updated_by === 'marco' ? 'Marco' : 'Tobi'} am {new Date(row.updated_at).toLocaleDateString('de-DE')}
        </p>
      )}
    </>
  )
}
