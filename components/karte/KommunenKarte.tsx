'use client'

import { memo, useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type MouseEvent } from 'react'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { saveKommune, resetKommune, type KommuneInput } from '@/app/actions'
import {
  H,
  STATUS_LABEL,
  STATUS_ORDER,
  W,
  auswahlKey,
  einwohner,
  useMapData,
  verbundTitel,
  type Auswahl,
  type Bounds,
  type Gemeinde,
  type KommuneStatus,
  type KommuneStatusRow,
  type MapData,
} from './daten'
import Detail from './Detail'
import Suche from './Suche'
import Uebersicht from './Uebersicht'

export type { KommuneStatusRow } from './daten'

const MAX_ZOOM = 60

// Eigene Komponente, damit Hover/Tooltip nicht alle ~11.000 Flächen neu rendern.
const GemeindeFlaechen = memo(function GemeindeFlaechen({
  gemeinden,
  fuellung,
}: {
  gemeinden: Gemeinde[]
  fuellung: Map<string, KommuneStatus>
}) {
  return (
    <g>
      {gemeinden.map((g) => {
        const s = fuellung.get(g.a)
        return <path key={g.a} d={g.d} data-ags={g.a} className={s ? `gem s-${s}` : 'gem'} />
      })}
    </g>
  )
})

type Optimistic = { type: 'save'; row: KommuneStatusRow } | { type: 'reset'; key: string }

// Klick auf eine Gemeinde: Verbundsebene vorschlagen, wenn die Gemeinde keine eigene
// Verwaltung hat (dann ist der Verbund der Ansprechpartner) oder der Verbund schon erfasst ist.
function standardAuswahl(data: MapData, rowByKey: Map<string, KommuneStatusRow>, ags: string): Auswahl {
  const g = data.byAgs.get(ags)
  if (!g?.v || rowByKey.has(ags)) return { ebene: 'gemeinde', ags }
  if (rowByKey.has(g.v) || data.eigeneKontakte(ags).length === 0) return { ebene: 'verbund', key: g.v, ags }
  return { ebene: 'gemeinde', ags }
}

export default function KommunenKarte({ kommunen }: { kommunen: KommuneStatusRow[] }) {
  const data = useMapData()
  const [, startTransition] = useTransition()
  const [rows, applyOptimistic] = useOptimistic(kommunen, (current: KommuneStatusRow[], action: Optimistic) =>
    action.type === 'save'
      ? [...current.filter((r) => r.ags !== action.row.ags), action.row]
      : current.filter((r) => r.ags !== action.key)
  )
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null)
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const canHover = useRef(false)
  useEffect(() => {
    canHover.current = window.matchMedia('(hover: hover)').matches
  }, [])

  const rowByKey = useMemo(() => new Map(rows.map((r) => [r.ags, r])), [rows])
  // Fläche einer Gemeinde: eigener Status, sonst der ihres Verbunds.
  const fuellung = useMemo(() => {
    const m = new Map<string, KommuneStatus>()
    if (!data) return m
    const verbund = new Map(rows.filter((r) => r.ebene === 'verbund').map((r) => [r.ags, r.status]))
    for (const g of data.gemeinden) {
      const s = rowByKey.get(g.a)?.status ?? (g.v ? verbund.get(g.v) : undefined)
      if (s) m.set(g.a, s)
    }
    return m
  }, [data, rows, rowByKey])

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
  function zoomTo(b: Bounds | null | undefined) {
    if (!b || !svgRef.current || !zoomRef.current) return
    const [[x0, y0], [x1, y1]] = b
    const k = Math.max(1, Math.min(24, 0.3 / Math.max((x1 - x0) / W, (y1 - y0) / H)))
    const t = zoomIdentity.translate(W / 2 - (k * (x0 + x1)) / 2, H / 2 - (k * (y0 + y1)) / 2).scale(k)
    select(svgRef.current).call(zoomRef.current.transform, t)
  }
  function focus(a: Auswahl) {
    setAuswahl(a)
    zoomTo(a.ebene === 'verbund' ? data?.verbundShape(a.key)?.bounds : data?.gemeindeBounds(a.ags))
  }

  function onMapClick(e: MouseEvent<SVGSVGElement>) {
    const ags = (e.target as Element).getAttribute('data-ags')
    if (ags && data) setAuswahl(standardAuswahl(data, rowByKey, ags))
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
  function reset(key: string) {
    startTransition(async () => {
      applyOptimistic({ type: 'reset', key })
      const res = await resetKommune(key)
      if (res.error) alert(`Zurücksetzen fehlgeschlagen: ${res.error}`)
    })
    setAuswahl(null)
  }

  const counts = useMemo(() => {
    const c = new Map<KommuneStatus, number>()
    for (const r of rows) c.set(r.status, (c.get(r.status) ?? 0) + 1)
    return c
  }, [rows])

  const hoverGem = hover ? data?.byAgs.get(hover.ags) : undefined
  const hoverVerb = hoverGem?.v ? data?.verbuende.get(hoverGem.v) : undefined
  const hoverStatus = hoverGem ? rowByKey.get(hoverGem.a)?.status : undefined
  const hoverVerbStatus = hoverVerb ? rowByKey.get(hoverVerb.key)?.status : undefined
  const hoverVerbShape = hoverVerb ? data?.verbundShape(hoverVerb.key) : null
  const selShape =
    auswahl && data
      ? auswahl.ebene === 'verbund'
        ? data.verbundShape(auswahl.key)?.d
        : data.byAgs.get(auswahl.ags)?.d
      : undefined

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
            {data && <Suche data={data} onPick={focus} />}
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
                    <GemeindeFlaechen gemeinden={data.gemeinden} fuellung={fuellung} />
                    <path className="verwaltungs-borders" d={data.verwaltungen} />
                    <path className="kreis-borders" d={data.kreise} />
                    <path className="land-borders" d={data.laender} />
                    <path className="outline" d={data.outline} />
                    {hoverVerbShape && <path className="hover-verbund" d={hoverVerbShape.d} />}
                    {hoverGem && <path className="hover-outline" d={hoverGem.d} />}
                    {selShape && <path className="sel-outline" d={selShape} />}
                  </>
                )}
              </g>
            </svg>
            {hover && hoverGem && (
              <div className="map-tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
                <strong>{hoverGem.n}</strong>
                <span>{hoverGem.k}</span>
                {hoverGem.e != null && <span>{einwohner(hoverGem.e)}</span>}
                {hoverVerb && (
                  <span className="tt-verbund">
                    {verbundTitel(hoverVerb)} · {hoverVerb.c} Gemeinden
                  </span>
                )}
                {hoverStatus ? (
                  <span className="tt-status">{STATUS_LABEL[hoverStatus]}</span>
                ) : hoverVerbStatus ? (
                  <span className="tt-status">{STATUS_LABEL[hoverVerbStatus]} (über Verbund)</span>
                ) : null}
              </div>
            )}
          </div>
          <p className="map-hint-line hint-mouse">Zoomen: Plus/Minus oder Strg/⌘ + Mausrad · Verschieben: ziehen · Beim Drüberfahren zeigt eine gestrichelte Linie den Verbund</p>
          <p className="map-hint-line hint-touch">Tippen wählt aus · Zoomen und Verschieben mit zwei Fingern oder Plus/Minus</p>
        </div>

        {/* Übersicht bleibt immer im Seitenfluss (sonst springt am Handy die Seite, wenn das
            Formular als Blatt von unten aufgeht); am Desktop blendet CSS sie bei Auswahl aus. */}
        <aside className={`map-side${auswahl && data ? ' has-selection' : ''}`}>
          <div className="side-overview">
            <Uebersicht rows={rows} data={data} onPick={focus} />
          </div>
          {auswahl && data && (
            <div className="detail-panel">
              <Detail
                key={auswahlKey(auswahl)}
                data={data}
                auswahl={auswahl}
                rowByKey={rowByKey}
                onWechsel={setAuswahl}
                onSave={save}
                onReset={reset}
                onClose={() => setAuswahl(null)}
              />
            </div>
          )}
        </aside>
      </div>

      <p className="map-attribution">
        Gemeindegrenzen und Verbünde: ©{' '}
        <a href="https://www.bkg.bund.de" target="_blank" rel="noreferrer">BKG</a> (2026){' '}
        <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noreferrer">dl-de/by-2-0</a>,{' '}
        <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf" target="_blank" rel="noreferrer">
          Datenquellen
        </a>{' '}
        · vereinfacht dargestellt · Einwohner: Statistisches Bundesamt, Stand 31.12.2024 · Anschriften: Statistische Ämter des
        Bundes und der Länder,{' '}
        <a href="https://www.statistikportal.de/de/veroeffentlichungen/anschriftenverzeichnis" target="_blank" rel="noreferrer">
          Stand 31.01.2026
        </a>
      </p>
    </div>
  )
}
