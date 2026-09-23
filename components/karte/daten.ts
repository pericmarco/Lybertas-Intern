import { useEffect, useState } from 'react'
import { geoIdentity, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { feature, merge, mesh } from 'topojson-client'
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from 'topojson-specification'

export type KommuneStatus =
  | 'nicht_kontaktiert'
  | 'angeschrieben'
  | 'termin_vereinbart'
  | 'gespraech_gefuehrt'
  | 'kunde'
  | 'abgesagt'

export type Ebene = 'gemeinde' | 'verbund'

export type KommuneStatusRow = {
  ags: string // Gemeinde: AGS (8-stellig) · Verbund: Gemeindeverbandsschlüssel (9-stellig)
  ebene: Ebene
  name: string
  status: KommuneStatus
  notes: string | null
  contact_date: string | null
  appointment_date: string | null
  updated_by: string | null
  updated_at: string
}

export const STATUS_LABEL: Record<KommuneStatus, string> = {
  nicht_kontaktiert: 'Auf der Liste',
  angeschrieben: 'Angeschrieben',
  termin_vereinbart: 'Termin vereinbart',
  gespraech_gefuehrt: 'Gespräch geführt',
  kunde: 'Kunde',
  abgesagt: 'Abgesagt',
}
export const STATUS_ORDER = Object.keys(STATUS_LABEL) as KommuneStatus[]

// a = AGS, n = Name, b = Bezeichnung, k = Landkreis, e = Einwohner (31.12.2024), v = Verbund-Schlüssel
type GemProps = { a: string; n: string; b: string; k: string; e?: number; v?: string }
export type Gemeinde = GemProps & { d: string; search: string }
export type Verbund = { key: string; n: string; t: string; c: number; e: number; k: string; search: string }
export type Kontakt = { sitz: string; anschrift: string; mail: string | null }

type Verwaltungen = {
  stand: string
  admins: [string, string, string | null][]
  gem: Record<string, number[]>
  verb: Record<string, { n: string; t: string; c: number; e: number; m: number | null }>
}
type GemTopology = Topology<{ gem: GeometryCollection<GemProps> }>

export type MapData = {
  gemeinden: Gemeinde[]
  byAgs: Map<string, Gemeinde>
  verbuende: Map<string, Verbund>
  // Eigene Verwaltung(en) der Gemeinde, ohne die Verbundsverwaltung.
  eigeneKontakte: (ags: string) => Kontakt[]
  verbundKontakt: (key: string) => Kontakt | null
  gemeindeBounds: (ags: string) => Bounds | null
  verbundShape: (key: string) => { d: string; bounds: Bounds } | null
  kreise: string
  laender: string
  verwaltungen: string
  outline: string
}
export type Bounds = [[number, number], [number, number]]

// Auswahl auf der Karte: eine Gemeinde, oder ein Verbund (ags = Gemeinde, über die er geöffnet wurde).
export type Auswahl = { ebene: 'gemeinde'; ags: string } | { ebene: 'verbund'; key: string; ags?: string }

export function auswahlKey(a: Auswahl) {
  return a.ebene === 'verbund' ? a.key : a.ags
}

// Einzelne Adressen aus dem Feld ziehen (enthält selten mehrere, z. B. „a@x.de (beBPo) / b@x.de").
export function mailAdressen(feld: string) {
  return feld.match(/[^\s()<>/;,]+@[^\s()<>/;,]+/g) ?? []
}

export const W = 800
export const H = 1080

const fmt = new Intl.NumberFormat('de-DE')
export function einwohner(e: number | undefined) {
  return e == null ? '' : `${fmt.format(e)} Einwohner`
}
export function einwohnerKurz(e: number) {
  if (e >= 1_000_000) return `${(e / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio.`
  if (e >= 10_000) return `${Math.round(e / 1000).toLocaleString('de-DE')} Tsd.`
  return fmt.format(e)
}

const COMBINING = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g')
export function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(COMBINING, '').replace(/ß/g, 'ss')
}

export function verbundTitel(v: Verbund) {
  return `${v.t} ${v.n}`
}

// „das Amt X" / „der Verwaltungsverband X" / „die Verbandsgemeinde X" — bzw. „zum"/„zur".
const NEUTRUM = new Set(['Amt'])
const MASKULIN = new Set(['Verwaltungsverband'])
export function verbundMitArtikel(v: Verbund, fall: 'nom' | 'dat') {
  const t = verbundTitel(v)
  if (NEUTRUM.has(v.t)) return (fall === 'nom' ? 'das ' : 'zum ') + t
  if (MASKULIN.has(v.t)) return (fall === 'nom' ? 'der ' : 'zum ') + t
  return (fall === 'nom' ? 'die ' : 'zur ') + t
}

export function useMapData(): MapData | null {
  const [data, setData] = useState<MapData | null>(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/gemeinden.topo.json').then((r) => r.json() as Promise<GemTopology>),
      fetch('/verwaltungen.json').then((r) => r.json() as Promise<Verwaltungen>),
    ]).then(([topo, vw]) => {
      if (cancelled) return
      const obj = topo.objects.gem
      const fc = feature(topo, obj)
      // Daten liegen schon projiziert vor (UTM 32), daher Identität statt Kartenprojektion.
      const path = geoPath(geoIdentity().reflectY(true).fitSize([W, H], fc)).digits(1)
      const features = new Map(fc.features.map((f) => [f.properties.a, f]))
      const gemeinden = fc.features.map((f) => ({ ...f.properties, d: path(f) ?? '', search: norm(f.properties.n) }))

      const verbuende = new Map<string, Verbund>()
      // Gemeinde-Geometrien sind immer (Multi-)Polygone; die Bibliothekstypen erlauben allgemeinere.
      type Flaeche = Polygon | MultiPolygon
      const mitglieder = new Map<string, Flaeche[]>()
      for (const g of obj.geometries) {
        const p = g.properties as GemProps
        const v = p.v
        if (!v) continue
        if (!mitglieder.has(v)) mitglieder.set(v, [])
        mitglieder.get(v)!.push(g as unknown as Flaeche)
        if (!verbuende.has(v) && vw.verb[v]) {
          const x = vw.verb[v]
          verbuende.set(v, { key: v, n: x.n, t: x.t, c: x.c, e: x.e, k: p.k, search: norm(x.n) })
        }
      }

      const kontakt = (i: number): Kontakt => {
        const [sitz, anschrift, mail] = vw.admins[i]
        return { sitz, anschrift, mail }
      }
      const shapes = new Map<string, { d: string; bounds: Bounds }>()
      const props = (g: { properties?: unknown }) => g.properties as GemProps
      // Verwaltungseinheit = Verbund, sonst die Gemeinde selbst.
      const einheit = (g: { properties?: unknown }) => props(g).v ?? props(g).a

      setData({
        gemeinden,
        byAgs: new Map(gemeinden.map((g) => [g.a, g])),
        verbuende,
        eigeneKontakte: (ags) => {
          const v = features.get(ags)?.properties.v
          const verbAdmin = v ? vw.verb[v]?.m : null
          return (vw.gem[ags] ?? []).filter((i) => i !== verbAdmin).map(kontakt)
        },
        verbundKontakt: (key) => {
          const m = vw.verb[key]?.m
          return m == null ? null : kontakt(m)
        },
        gemeindeBounds: (ags) => {
          const f = features.get(ags)
          return f ? path.bounds(f as GeoPermissibleObjects) : null
        },
        verbundShape: (key) => {
          if (shapes.has(key)) return shapes.get(key)!
          const geoms = mitglieder.get(key)
          if (!geoms) return null
          const merged = merge(topo, geoms)
          const shape = { d: path(merged) ?? '', bounds: path.bounds(merged) }
          shapes.set(key, shape)
          return shape
        },
        kreise: path(mesh(topo, obj, (x, y) => x !== y && props(x).a.slice(0, 5) !== props(y).a.slice(0, 5))) ?? '',
        laender: path(mesh(topo, obj, (x, y) => x !== y && props(x).a.slice(0, 2) !== props(y).a.slice(0, 2))) ?? '',
        verwaltungen: path(mesh(topo, obj, (x, y) => x !== y && einheit(x) !== einheit(y))) ?? '',
        outline: path(mesh(topo, obj, (x, y) => x === y)) ?? '',
      })
    })
    return () => {
      cancelled = true
    }
  }, [])
  return data
}
