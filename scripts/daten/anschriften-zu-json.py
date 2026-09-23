# Wandelt das Anschriftenverzeichnis der Statistischen Ämter (Excel) in anschriften.json um.
# Aufruf: python3 anschriften-zu-json.py <Anschriften_…xlsx>   (braucht: pip install openpyxl)
import json, sys
import openpyxl

wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
blatt = next(ws for ws in wb.worksheets if ws.title.startswith('Anschriften_'))
out = []
for r in blatt.iter_rows(min_row=7, values_only=True):
    if r[2] not in (50, 60):  # 50 = Gemeindeverband, 60 = Gemeinde
        continue
    out.append(dict(satzart=r[2], form=r[4], ars=str(r[5]) if r[5] else None, ags=r[6] or None, name=r[7],
                    sitz=r[8], strasse=r[9], plz=str(r[10]) if r[10] else None, ort=r[11],
                    mail=(r[12] or '').strip() or None))
json.dump(out, open('anschriften.json', 'w'), ensure_ascii=False)
print(len(out), 'Einträge')
