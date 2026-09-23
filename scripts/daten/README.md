# Kartendaten neu erzeugen

Erzeugt `public/gemeinden.topo.json` (Gemeindegrenzen, Einwohner, Verbund) und
`public/verwaltungen.json` (Verbünde, Anschriften und E-Mail der Verwaltungen).
Nur nötig, wenn neue Daten erscheinen (Grenzen/Einwohner jährlich, Anschriften mehrmals im Jahr).

## Quellen
- BKG VG250 (Stand 01.01.): https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_0101/aktuell/vg250_01-01.utm32s.shape.ebenen.zip
- BKG VG250-EW (Einwohner, Stand 31.12.): https://daten.gdz.bkg.bund.de/produkte/vg/vg250-ew_ebenen_1231/aktuell/vg250-ew_12-31.utm32s.shape.ebenen.zip
- Anschriften der Gemeinde- und Stadtverwaltungen (Excel): https://www.statistikportal.de/de/veroeffentlichungen/anschriftenverzeichnis

## Ablauf (in einem leeren Arbeitsordner)
```bash
npm i mapshaper topojson-client
unzip vg250.zip; unzip vg250ew.zip -d ew
M=vg250_ebenen_0101
npx mapshaper $M/VG250_KRS.shp -filter 'GF==4' -filter-fields AGS,GEN,BEZ -o format=json krs.json
npx mapshaper $M/VG250_VWG.shp -filter 'GF==4' -filter-fields ARS,GEN,BEZ -o format=json vwg.json
npx mapshaper $M/VG250_GEM.shp -filter 'GF==4' -filter-fields AGS,ARS,GEN -o format=json gemars.json
npx mapshaper $M/VG250_GEM.shp -filter 'GF==4' -filter-fields AGS,GEN,BEZ -simplify 3% keep-shapes \
  -rename-layers gem -o format=topojson quantization=100000 gem.topo.json
npx mapshaper "$(find ew -iname 'VG250_GEM.shp')" -filter 'GF==4' -filter-fields AGS,GEN,EWZ -o format=json ewz.json
python3 anschriften-zu-json.py Anschriften_….xlsx
node 1-gemeinden.mjs      # → gemeinden.topo.json (Name, Kreis, Einwohner)
node 2-verwaltungen.mjs   # → gemeinden.topo.json (+ Verbund) und verwaltungen.json
cp gemeinden.topo.json verwaltungen.json ../../public/
```
Stand-Angaben im Quellenvermerk (`components/karte/KommunenKarte.tsx`) danach anpassen.
