'use client'

import { memo, useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type MouseEvent } from 'react'
import { geoIdentity, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { feature, mesh } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { saveKommune, resetKommune, type KommuneInput } from '@/app/actions'

export type KommuneStatus =
  | 'nicht_kontaktiert'
  | 'angeschrieben'
  | 'termin_vereinbart'
  | 'gespraech_gefuehrt'
  | 'kunde'
  | 'abgesagt'

export type KommuneStatusRow = {
  ags: string
  name: string
  status: KommuneStatus
  notes: string | null
  contact_date: string | null
  appointment_date: string | null
  updated_by: string | null
  updated_at: string
}

const STATUS_LABEL: Record<KommuneStatus, string> = {
  nicht_kontaktiert: 'Auf der Liste',
  angeschrieben: 'Angeschrieben',
  termin_vereinbart: 'Termin vereinbart',
  gespraech_gefuehrt: 'Gespräch geführt',
  kunde: 'Kunde',
  abgesagt: 'Abgesagt',
}
const STATUS_ORDER = Object.keys(STATUS_LABEL) as KommuneStatus[]

// a = AGS, n = Name, b = Bezeichnung (Stadt/Gemeinde/…), k = Landkreis, e = Einwohner (31.12.2024)
type GemProps = { a: string; n: string; b: string; k: string; e?: number }
type Gemeinde = GemProps & { d: string; search: string }
type GemTopology = Topology<{ gem: GeometryCollection<GemProps> }>

type MapData = {
  gemeinden: Gemeinde[]
  byAgs: Map<string, Gemeinde>
  bounds: (ags: string) => [[number, number], [number, number]] | null
  kreise: string
  laender: string
  outline: string
}

const W = 800
const H = 1080
const MAX_ZOOM = 60

const fmt = new Intl.NumberFormat('de-DE')
function einwohner(e: number | undefined) {
  return e == null ? '' : `${fmt.format(e)} Einwohner`
}
function einwohnerKurz(e: number) {
  if (e >= 1_000_000) return `${(e / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio.`
  if (e >= 10_000) return `${Math.round(e / 1000).toLocaleString('de-DE')} Tsd.`
  return fmt.format(e)
}

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss')
}

function useMapData(): MapData | null {
  const [data, setData] = useState<MapData | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/gemeinden.topo.json')
      .then((r) => r.json())
      .then((topo: GemTopology) => {
        if (cancelled) return
        const obj = topo.objects.gem
        const fc = feature(topo, obj)
        // Daten liegen schon projiziert vor (UTM 32), daher Identität statt Kartenprojektion.
        const path = geoPath(geoIdentity().reflectY(true).fitSize([W, H], fc)).digits(1)
        const features = new Map(fc.features.map((f) => [f.properties.a, f]))
        const gemeinden = fc.features.map((f) => ({
          ...f.properties,
          d: path(f) ?? '',
          search: norm(f.properties.n),
        }))
        const agsOf = (g: { properties?: unknown }) => (g.properties as GemProps).a
        const border = (len: number) =>
          path(mesh(topo, obj, (x, y) => x !== y && agsOf(x).slice(0, len) !== agsOf(y).slice(0, len))) ?? ''
        setData({
          gemeinden,
          byAgs: new Map(gemeinden.map((g) => [g.a, g])),
          bounds: (ags) => {
            const f = features.get(ags)
            return f ? path.bounds(f as GeoPermissibleObjects) : null
          },
          kreise: border(5),
          laender: border(2),
          outline: path(mesh(topo, obj, (x, y) => x === y)) ?? '',
        })
      })
    return () => {
      cancelled = true
    }
  }, [])
  return data
}

// Eigene Komponente, damit Hover/Tooltip nicht alle ~11.000 Flächen neu rendern.
const GemeindeFlaechen = memo(function GemeindeFlaechen({
  gemeinden,
  statusByAgs,
}: {
  gemeinden: Gemeinde[]
  statusByAgs: Map<string, KommuneStatus>
}) {
  return (
    <g>
      {gemeinden.map((g) => {
        const s = statusByAgs.get(g.a)
        return <path key={g.a} d={g.d} data-ags={g.a} className={s ? `gem s-${s}` : 'gem'} />
      })}
    </g>
  )
})

type Optimistic = { type: 'save'; row: KommuneStatusRow } | { type: 'reset'; ags: string }

export default function KommunenKarte({ kommunen }: { kommunen: KommuneStatusRow[] }) {
  const data = useMapData()
  const [, startTransition] = useTransition()
  const [rows, applyOptimistic] = useOptimistic(kommunen, (current: KommuneStatusRow[], action: Optimistic) =>
    action.type === 'save'
      ? [...current.filter((r) => r.ags !== action.row.ags), action.row]
      : current.filter((r) => r.ags !== action.ags)
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const canHover = useRef(false)
  useEffect(() => {
    canHover.current = window.matchMedia('(hover: hover)').matches
  }, [])

  const rowByAgs = useMemo(() => new Map(rows.map((r) => [r.ags, r])), [rows])
  const statusByAgs = useMemo(() => new Map(rows.map((r) => [r.ags, r.status])), [rows])

  useEffect(() => {
    if (!data || !svgRef.current || !gRef.current) return
    const svg = select(svgRef.current)
    const g = gRef.current
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([[0, 0], [W, H]])
      // Mausrad nur mit Strg/⌘ (auch Trackpad-Pinch), Touch nur mit zwei Fingern — sonst hängt man
      // beim Scrollen der Seite in der Karte fest. Ein Finger scrollt, Tippen wählt aus.
      .filter((event) => {
        if (event.type === 'wheel') return event.ctrlKey || event.metaKey
        if (event.type.startsWith('touch')) return event.touches.length >= 2
        return !event.button
      })
      .on('zoom', (event) => g.setAttribute('transform', event.transform.toString()))
    svg.call(z).on('dblclick.zoom', null)
    zoomRef.current = z
    return () => {
      svg.on('.zoom', null)
    }
  }, [data])

  function zoomBy(factor: number) {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.scaleBy, factor)
  }
  function zoomReset() {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity)
  }
  function focus(ags: string) {
    setSelected(ags)
    const b = data?.bounds(ags)
    if (!b || !svgRef.current || !zoomRef.current) return
    const [[x0, y0], [x1, y1]] = b
    const k = Math.max(1, Math.min(24, 0.3 / Math.max((x1 - x0) / W, (y1 - y0) / H)))
    const t = zoomIdentity.translate(W / 2 - (k * (x0 + x1)) / 2, H / 2 - (k * (y0 + y1)) / 2).scale(k)
    select(svgRef.current).call(zoomRef.current.transform, t)
  }

  function onMapClick(e: MouseEvent<SVGSVGElement>) {
    const ags = (e.target as Element).getAttribute('data-ags')
    if (ags) setSelected(ags)
  }
  function onMapMove(e: MouseEvent<SVGSVGElement>) {
    if (!canHover.current) return
    const ags = (e.target as Element).getAttribute('data-ags')
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!ags || !rect) return setHover(null)
    setHover({ ags, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  function save(input: KommuneInput) {
    startTransition(async () => {
      applyOptimistic({
        type: 'save',
        row: { ...input, status: input.status as KommuneStatus, notes: input.notes || null, updated_by: null, updated_at: new Date().toISOString() },
      })
      const res = await saveKommune(input)
      if (res.error) alert(`Speichern fehlgeschlagen: ${res.error}`)
    })
  }
  function reset(ags: string) {
    startTransition(async () => {
      applyOptimistic({ type: 'reset', ags })
      const res = await resetKommune(ags)
      if (res.error) alert(`Zurücksetzen fehlgeschlagen: ${res.error}`)
    })
    setSelected(null)
  }

  const counts = useMemo(() => {
    const c = new Map<KommuneStatus, number>()
    for (const r of rows) c.set(r.status, (c.get(r.status) ?? 0) + 1)
    return c
  }, [rows])

  const selGem = selected ? data?.byAgs.get(selected) : undefined
  const selRow = selected ? rowByAgs.get(selected) : undefined
  const hoverGem = hover ? data?.byAgs.get(hover.ags) : undefined
  const hoverRow = hover ? rowByAgs.get(hover.ags) : undefined

  return (
    <div className="card">
      <div className="legend">
        {STATUS_ORDER.map((s) => (
          <span key={s}>
            <span className="dot" style={{ background: `var(--status-${s})` }} />
            {STATUS_LABEL[s]} <b>{counts.get(s) ?? 0}</b>
          </span>
        ))}
      </div>

      <div className="map-layout">
        <div className="map-col">
          <div className="map-toolbar">
            {data && <Suche gemeinden={data.gemeinden} onPick={focus} />}
            <div className="zoom-buttons">
              <button className="btn" onClick={() => zoomBy(1.8)} aria-label="Hineinzoomen">+</button>
              <button className="btn" onClick={() => zoomBy(1 / 1.8)} aria-label="Herauszoomen">−</button>
              <button className="btn" onClick={zoomReset}>Ganz</button>
            </div>
          </div>

          <div className="map-wrap" ref={wrapRef}>
            {!data && <p className="empty map-loading">Karte wird geladen…</p>}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="map-svg"
              onClick={onMapClick}
              onMouseMove={onMapMove}
              onMouseLeave={() => setHover(null)}
            >
              <g ref={gRef}>
                {data && (
                  <>
                    <GemeindeFlaechen gemeinden={data.gemeinden} statusByAgs={statusByAgs} />
                    <path className="kreis-borders" d={data.kreise} />
                    <path className="land-borders" d={data.laender} />
                    <path className="outline" d={data.outline} />
                    {hoverGem && <path className="hover-outline" d={hoverGem.d} />}
                    {selGem && <path className="sel-outline" d={selGem.d} />}
                  </>
                )}
              </g>
            </svg>
            {hover && hoverGem && (
              <div className="map-tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
                <strong>{hoverGem.n}</strong>
                <span>{hoverGem.k}</span>
                {hoverGem.e != null && <span>{einwohner(hoverGem.e)}</span>}
                {hoverRow && <span className="tt-status">{STATUS_LABEL[hoverRow.status]}</span>}
              </div>
            )}
          </div>
          <p className="map-hint-line hint-mouse">Zoomen: Plus/Minus oder Strg/⌘ + Mausrad · Verschieben: ziehen</p>
          <p className="map-hint-line hint-touch">Tippen wählt aus · Zoomen und Verschieben mit zwei Fingern oder Plus/Minus</p>
        </div>

        {/* Übersicht bleibt immer im Seitenfluss (sonst springt am Handy die Seite, wenn das
            Formular als Blatt von unten aufgeht); am Desktop blendet CSS sie bei Auswahl aus. */}
        <aside className={`map-side${selected && selGem ? ' has-selection' : ''}`}>
          <div className="side-overview">
            <Uebersicht rows={rows} onPick={focus} einwohnerVon={(ags) => data?.byAgs.get(ags)?.e} />
          </div>
          {selected && selGem && (
            <div className="detail-panel">
              <DetailForm
                key={selected}
                gemeinde={selGem}
                row={selRow}
                onSave={save}
                onReset={() => reset(selected)}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </aside>
      </div>

      <p className="map-attribution">
        Gemeindegrenzen: ©{' '}
        <a href="https://www.bkg.bund.de" target="_blank" rel="noreferrer">BKG</a> (2026){' '}
        <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noreferrer">dl-de/by-2-0</a>,{' '}
        <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf" target="_blank" rel="noreferrer">
          Datenquellen
        </a>{' '}
        · vereinfacht dargestellt · Einwohner: Statistisches Bundesamt, Stand 31.12.2024
      </p>
    </div>
  )
}

function Suche({ gemeinden, onPick }: { gemeinden: Gemeinde[]; onPick: (ags: string) => void }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const n = norm(q.trim())
    if (n.length < 2) return []
    const starts = gemeinden.filter((g) => g.search.startsWith(n)).sort((a, b) => a.n.length - b.n.length)
    const contains = gemeinden.filter((g) => !g.search.startsWith(n) && g.search.includes(n))
    return [...starts, ...contains].slice(0, 8)
  }, [q, gemeinden])

  function pick(ags: string) {
    onPick(ags)
    setQ('')
  }

  return (
    <div className="search">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && results[0] && pick(results[0].a)}
        placeholder="Gemeinde suchen…"
        aria-label="Gemeinde suchen"
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((g) => (
            <li key={g.a}>
              <button onClick={() => pick(g.a)}>
                <strong>{g.n}</strong> <span>{g.k}{g.e != null && ` · ${einwohnerKurz(g.e)}`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Uebersicht({
  rows,
  onPick,
  einwohnerVon,
}: {
  rows: KommuneStatusRow[]
  onPick: (ags: string) => void
  einwohnerVon: (ags: string) => number | undefined
}) {
  if (rows.length === 0) {
    return (
      <div className="side-empty">
        <h3>Noch keine Kommunen markiert</h3>
        <p>Such oben nach einer Gemeinde oder klick direkt auf die Karte, um einen Status zu setzen.</p>
      </div>
    )
  }
  return (
    <div className="side-list">
      {STATUS_ORDER.map((s) => {
        const list = rows.filter((r) => r.status === s).sort((a, b) => a.name.localeCompare(b.name, 'de'))
        if (list.length === 0) return null
        const summe = list.reduce((sum, r) => sum + (einwohnerVon(r.ags) ?? 0), 0)
        return (
          <div key={s} className="side-group">
            <h3>
              <span className="dot" style={{ background: `var(--status-${s})` }} />
              {STATUS_LABEL[s]} <span>{list.length}</span>
              {summe > 0 && <span className="side-sum">{einwohnerKurz(summe)} Einwohner</span>}
            </h3>
            <ul>
              {list.map((r) => (
                <li key={r.ags}>
                  <button onClick={() => onPick(r.ags)}>
                    {r.name}
                    {r.appointment_date && <span> · Termin {new Date(r.appointment_date).toLocaleDateString('de-DE')}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function DetailForm({
  gemeinde,
  row,
  onSave,
  onReset,
  onClose,
}: {
  gemeinde: Gemeinde
  row: KommuneStatusRow | undefined
  onSave: (input: KommuneInput) => void
  onReset: () => void
  onClose: () => void
}) {
  const [status, setStatus] = useState<KommuneStatus>(row?.status ?? 'nicht_kontaktiert')
  const [notes, setNotes] = useState(row?.notes ?? '')
  const [contactDate, setContactDate] = useState(row?.contact_date ?? '')
  const [appointmentDate, setAppointmentDate] = useState(row?.appointment_date ?? '')

  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <h3>{gemeinde.n}</h3>
          <p>
            {gemeinde.b} · {gemeinde.k}
            {gemeinde.e != null && (
              <>
                <br />
                {einwohner(gemeinde.e)}
              </>
            )}
          </p>
        </div>
        <button className="btn link" onClick={onClose} aria-label="Schließen">✕</button>
      </div>
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
          <button className="btn danger" onClick={() => confirm(`${gemeinde.n} von der Karte entfernen?`) && onReset()}>
            Entfernen
          </button>
        ) : (
          <span />
        )}
        <button
          className="btn primary"
          onClick={() =>
            onSave({
              ags: gemeinde.a,
              name: gemeinde.n,
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
      {row?.updated_by && (
        <p className="detail-meta">
          Zuletzt geändert von {row.updated_by === 'marco' ? 'Marco' : 'Tobi'} am{' '}
          {new Date(row.updated_at).toLocaleDateString('de-DE')}
        </p>
      )}
    </div>
  )
}
