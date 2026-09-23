// Einmalige Aufbereitung: VG250-Gemeinden (vereinfacht) + Kreisnamen → kompakte TopoJSON.
import { readFileSync, writeFileSync } from 'node:fs'

const topo = JSON.parse(readFileSync('gem.topo.json', 'utf8'))
const krs = JSON.parse(readFileSync('krs.json', 'utf8'))

function kreisLabel({ GEN, BEZ }) {
  if (/kreis/i.test(GEN)) return GEN
  return `${BEZ} ${GEN}`
}
const kreis = new Map(krs.map((k) => [k.AGS, kreisLabel(k)]))

// Einwohner (VG250-EW, Stand 31.12.2024). Gemeinden, deren Schlüssel sich 2025
// geändert hat (z. B. Hanau, seit 2026 kreisfrei), über den im Bundesland
// eindeutigen Namen zuordnen.
const ew = JSON.parse(readFileSync('ewz.json', 'utf8'))
const ewByAgs = new Map(ew.map((r) => [r.AGS, r.EWZ]))
const ewByLandName = new Map()
for (const r of ew) {
  const key = `${r.AGS.slice(0, 2)}|${r.GEN}`
  ewByLandName.set(key, ewByLandName.has(key) ? null : r.EWZ)
}

let missing = 0
let viaName = 0
let noEw = 0
for (const g of topo.objects.gem.geometries) {
  const p = g.properties
  const k = kreis.get(p.AGS.slice(0, 5))
  if (!k) missing++
  let e = ewByAgs.get(p.AGS)
  if (e == null) {
    e = ewByLandName.get(`${p.AGS.slice(0, 2)}|${p.GEN}`) ?? undefined
    if (e != null) viaName++
    else noEw++
  }
  // Kurze Schlüssel sparen bei ~11.000 Einträgen spürbar Dateigröße.
  g.properties = { a: p.AGS, n: p.GEN, b: p.BEZ, k: k ?? '', ...(e != null ? { e } : {}) }
}
console.log('Einwohner: über Namen zugeordnet', viaName, '| ohne Zahl', noEw)

writeFileSync('gemeinden.topo.json', JSON.stringify(topo))
const out = readFileSync('gemeinden.topo.json')
console.log('Gemeinden:', topo.objects.gem.geometries.length, '| ohne Kreis:', missing, '| Größe:', (out.length / 1024 / 1024).toFixed(2), 'MB')
const probe = topo.objects.gem.geometries.filter((g) => ['05162004', '05315000', '09162000'].includes(g.properties.a)).map((g) => g.properties)
console.log(probe)
