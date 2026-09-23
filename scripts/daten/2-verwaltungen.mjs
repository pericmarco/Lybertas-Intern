// Einmalige Aufbereitung: Verbundzugehörigkeit (BKG VG250) + Anschriften der Verwaltungen
// (Statistische Ämter, Stand 31.01.2026) → gemeinden.topo.json (Feld v) + verwaltungen.json.
import { readFileSync, writeFileSync } from 'node:fs'

const topo = JSON.parse(readFileSync('gemeinden.topo.json', 'utf8'))
const gemArs = JSON.parse(readFileSync('gemars.json', 'utf8')) // AGS, ARS, GEN (BKG)
const vwg = JSON.parse(readFileSync('vwg.json', 'utf8')) // ARS, GEN, BEZ (BKG)
const rows = JSON.parse(readFileSync('anschriften.json', 'utf8')) // aus der Excel-Datei, s. u.

// Verbünde = Gemeindeverbände mit mehr als einer Mitgliedsgemeinde.
const arsByAgs = new Map(gemArs.map((g) => [g.AGS, g.ARS]))
const members = new Map()
for (const g of gemArs) {
  const k = g.ARS.slice(0, 9)
  members.set(k, (members.get(k) ?? 0) + 1)
}
const vwgByKey = new Map(vwg.map((v) => [v.ARS.slice(0, 9), v]))

// Verwaltungen deduplizieren: [Sitz, Anschrift, E-Mail]
const admins = []
const adminIdx = new Map()
function admin(r) {
  const s = (r.sitz ?? '').trim()
  const a = [r.strasse, [r.plz, r.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const m = (r.mail ?? '').trim() || null
  const key = `${s}|${a}|${m}`
  if (!adminIdx.has(key)) {
    adminIdx.set(key, admins.length)
    admins.push([s, a, m])
  }
  return adminIdx.get(key)
}

const verbRow = new Map(rows.filter((r) => r.satzart === 50).map((r) => [String(r.ars), r]))
const gemRows = new Map()
for (const r of rows.filter((r) => r.satzart === 60)) {
  if (!gemRows.has(r.ags)) gemRows.set(r.ags, [])
  gemRows.get(r.ags).push(r)
}

const ewByAgs = new Map(topo.objects.gem.geometries.map((g) => [g.properties.a, g.properties.e ?? 0]))
const verb = {}
const gem = {}
let inVerbund = 0
for (const g of topo.objects.gem.geometries) {
  const p = g.properties
  const ars = arsByAgs.get(p.a)
  const vk = ars && members.get(ars.slice(0, 9)) > 1 ? ars.slice(0, 9) : null
  if (vk) {
    p.v = vk
    inVerbund++
    if (!verb[vk]) {
      const v = vwgByKey.get(vk)
      const vr = verbRow.get(vk)
      verb[vk] = { n: v?.GEN ?? vr?.name ?? vk, t: v?.BEZ ?? vr?.form ?? 'Verbund', c: 0, e: 0, m: vr ? admin(vr) : null }
    }
    verb[vk].c++
    verb[vk].e += ewByAgs.get(p.a) ?? 0
  }
  // Zuständige Verwaltung(en) der Gemeinde: eigene zuerst, Verbundsverwaltung danach.
  const rs = gemRows.get(p.a) ?? []
  const vName = vk ? verbRow.get(vk)?.name : null
  const own = rs.filter((r) => r.sitz !== vName)
  const viaVerbund = rs.filter((r) => r.sitz === vName)
  const idx = [...own, ...viaVerbund].map(admin)
  // Ohne E-Mail beim eigenen Eintrag, aber mit E-Mail beim Verbund: nichts verlieren.
  if (idx.length) gem[p.a] = [...new Set(idx)]
}

writeFileSync('gemeinden.topo.json', JSON.stringify(topo))
writeFileSync(
  'verwaltungen.json',
  JSON.stringify({ stand: '31.01.2026', admins, gem, verb })
)
const size = (f) => (readFileSync(f).length / 1024).toFixed(0) + ' KB'
console.log('Gemeinden im Verbund:', inVerbund, '| Verbünde:', Object.keys(verb).length, '| Verwaltungen:', admins.length)
console.log('Gemeinden mit Kontakt:', Object.keys(gem).length, '| davon mit eigener Verwaltung + Verbund:', Object.values(gem).filter((x) => x.length > 1).length)
console.log('Größen: topo', size('gemeinden.topo.json'), '| verwaltungen', size('verwaltungen.json'))
const show = (a) => ({ gemeinde: a, kontakte: (gem[a] ?? []).map((i) => admins[i]) })
console.log(JSON.stringify([show('07232201'), show('08115054'), show('05162004')], null, 1))
console.log('Bitburger Land:', verb['072325008'], admins[verb['072325008'].m])
