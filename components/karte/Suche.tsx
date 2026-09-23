'use client'

import { useMemo, useState } from 'react'
import { einwohnerKurz, norm, verbundTitel, type Auswahl, type MapData } from './daten'

type Treffer = { auswahl: Auswahl; titel: string; sub: string; rang: number; laenge: number }

export default function Suche({ data, onPick }: { data: MapData; onPick: (a: Auswahl) => void }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const n = norm(q.trim())
    if (n.length < 2) return []
    const out: Treffer[] = []
    for (const g of data.gemeinden) {
      const rang = g.search.startsWith(n) ? 0 : g.search.includes(n) ? 2 : -1
      if (rang < 0) continue
      const verb = g.v ? data.verbuende.get(g.v) : undefined
      out.push({
        auswahl: { ebene: 'gemeinde', ags: g.a },
        titel: g.n,
        sub: [g.k, g.e != null ? einwohnerKurz(g.e) : null, verb ? verbundTitel(verb) : null].filter(Boolean).join(' · '),
        rang,
        laenge: g.n.length,
      })
    }
    for (const v of data.verbuende.values()) {
      const rang = v.search.startsWith(n) ? 1 : v.search.includes(n) ? 3 : -1
      if (rang < 0) continue
      out.push({
        auswahl: { ebene: 'verbund', key: v.key },
        titel: verbundTitel(v),
        sub: `${v.c} Gemeinden · ${einwohnerKurz(v.e)} · ${v.k}`,
        rang,
        laenge: v.n.length,
      })
    }
    return out.sort((a, b) => a.rang - b.rang || a.laenge - b.laenge).slice(0, 8)
  }, [q, data])

  function pick(a: Auswahl) {
    onPick(a)
    setQ('')
  }

  return (
    <div className="search">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && results[0] && pick(results[0].auswahl)}
        placeholder="Gemeinde oder Verbund suchen…"
        aria-label="Gemeinde oder Verbund suchen"
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={`${r.auswahl.ebene}-${r.auswahl.ebene === 'verbund' ? r.auswahl.key : r.auswahl.ags}`}>
              <button onClick={() => pick(r.auswahl)}>
                <strong>{r.titel}</strong> <span>{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
