'use client'

import { STATUS_LABEL, STATUS_ORDER, einwohnerKurz, type Auswahl, type KommuneStatusRow, type MapData } from './daten'

export default function Uebersicht({
  rows,
  data,
  onPick,
}: {
  rows: KommuneStatusRow[]
  data: MapData | null
  onPick: (a: Auswahl) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="side-empty">
        <h3>Noch keine Kommunen markiert</h3>
        <p>Such oben nach einer Gemeinde oder einem Verbund, oder klick direkt auf die Karte, um einen Status zu setzen.</p>
      </div>
    )
  }
  const ew = (r: KommuneStatusRow) =>
    (r.ebene === 'verbund' ? data?.verbuende.get(r.ags)?.e : data?.byAgs.get(r.ags)?.e) ?? 0

  return (
    <div className="side-list">
      {STATUS_ORDER.map((s) => {
        const list = rows.filter((r) => r.status === s).sort((a, b) => a.name.localeCompare(b.name, 'de'))
        if (list.length === 0) return null
        const summe = list.reduce((sum, r) => sum + ew(r), 0)
        return (
          <div key={s} className="side-group">
            <h3>
              <span className="dot" style={{ background: `var(--status-${s})` }} />
              {STATUS_LABEL[s]} <span>{list.length}</span>
              {summe > 0 && <span className="side-sum">{einwohnerKurz(summe)} Einwohner</span>}
            </h3>
            <ul>
              {list.map((r) => {
                const verb = r.ebene === 'verbund' ? data?.verbuende.get(r.ags) : undefined
                return (
                  <li key={r.ags}>
                    <button onClick={() => onPick(r.ebene === 'verbund' ? { ebene: 'verbund', key: r.ags } : { ebene: 'gemeinde', ags: r.ags })}>
                      {r.name}
                      {verb && <span> · {verb.c} Gemeinden</span>}
                      {r.appointment_date && <span> · Termin {new Date(r.appointment_date).toLocaleDateString('de-DE')}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
