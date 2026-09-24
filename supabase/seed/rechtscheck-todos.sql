-- Rechts-Check vom 24.09.2026: alle Befunde als Todos, nach Bereich gruppiert
-- und nach Dringlichkeit eingefärbt. Im Supabase SQL-Editor des Projekts
-- lybertas-intern ausführen. Mehrfach ausführbar: Todos, deren Text schon
-- existiert, werden nicht doppelt angelegt; von Hand gesetzte Farben bleiben.

-- Spalte für die Dringlichkeit (wie Migration 003), falls die noch fehlt.
alter table public.todos add column if not exists priority text
  check (priority in ('dringend', 'wichtig', 'spaeter'));

insert into public.todos (text, priority, created_by, created_at)
select t.text, t.prio, 'rechtscheck', now() - interval '1 second' * (100 - t.n)
from (values
  (1,  'Datenschutz: Profile vermutlich für alle Angemeldeten lesbar (Name, Geschlecht, Alter, Stadtteil) — Leseregel auf eigenes Profil und Admins beschränken', 'dringend'),
  (2,  'Datenschutz: Nutzer-IDs von Positionen und Likes nicht mehr öffentlich mitschicken (heute pseudonym, nicht anonym)', 'dringend'),
  (3,  'Datenschutz: Demografie-Funktion der Umfragen nur noch zusammengefasst und nicht ohne Login', 'dringend'),
  (4,  'Datenschutz: Art. 9 — ausdrückliche Einwilligung für politische Meinungen einbauen und den Satz „keine Art.-9-Daten“ ersetzen (mit Datenschutzbeauftragtem)', 'dringend'),
  (5,  'Datenschutz: Datenschutz-Folgenabschätzung (DSFA) erstellen', 'dringend'),
  (6,  'Datenschutz: Externen Datenschutzbeauftragten benennen (§ 38 BDSG, weil DSFA-Pflicht)', 'dringend'),
  (7,  'Datenschutz: Verzeichnis der Verarbeitungstätigkeiten, TOMs und Ablauf für Datenpannen (72 h) anlegen', 'wichtig'),
  (8,  'Datenschutz: Datenschutzerklärung — Fakten korrigieren (Irland, Supabase USA/Standardvertragsklauseln, Resend USA, Stadt als Empfängerin, Löschung, Passwort-Hash)', 'dringend'),
  (9,  'Datenschutz: Alter, Geschlecht und Stadtteil wirklich freiwillig machen und „Deine Angaben sind anonym“ korrigieren', 'dringend'),
  (10, 'Datenschutz: GPS-/EXIF-Daten aus hochgeladenen Fotos entfernen', 'wichtig'),
  (11, 'Datenschutz: Bei der Registrierung die aktuelle Version der Datenschutzerklärung speichern (heute „1“ statt „2“)', 'wichtig'),
  (12, 'Datenschutz: Festhalten, dass Städte nur zusammengefasste, anonyme Auswertungen bekommen (Zweckbindung)', 'wichtig'),
  (13, 'Datenschutz: Sentry vor dem Einschalten in die Datenschutzerklärung aufnehmen', 'spaeter'),

  (14, 'DSA: Kontaktstelle für Behörden und Nutzer benennen (Art. 11/12)', 'dringend'),
  (15, 'DSA: Melden auch ohne Konto ermöglichen, auch für Positionen und Kommentare (Art. 16)', 'wichtig'),
  (16, 'DSA: Autor:innen bei Löschen/Einschränken mit Begründung informieren, Meldende über die Entscheidung (Art. 16/17)', 'wichtig'),
  (17, 'DSA: Automatischen Wortfilter in den Nutzungsbedingungen offenlegen (Art. 14)', 'wichtig'),
  (18, 'DSA: Moderation ehrlich beschriften („zurückgestellt“ blendet nichts aus, Admin-Rückzug nicht als „vom Autor“)', 'wichtig'),
  (19, 'DSA: Kontosperre umsetzen oder aus den Community-Richtlinien streichen', 'wichtig'),

  (20, 'Rechtstexte: Nutzungsbedingungen bei der Registrierung akzeptieren lassen', 'dringend'),
  (21, 'Rechtstexte: Zustimmungsfiktion in § 10 Nutzungsbedingungen streichen (BGH XI ZR 26/20)', 'wichtig'),
  (22, 'Rechtstexte: Impressum und Datenschutz im Musterstadt-Portal verlinken, Rechtsseiten dort erreichbar machen', 'wichtig'),

  (23, 'Rollen & Rechte: Autor:innen dürfen Status und Relevanz ihrer Forderung nicht selbst ändern', 'dringend'),
  (24, 'Rollen & Rechte: Politiker:innen dürfen Name/Partei unter ihrer Antwort nicht nachträglich ändern', 'dringend'),
  (25, 'Rollen & Rechte: Stadt- und Politik-Konten dürfen nicht in fremde Städte veröffentlichen', 'dringend'),
  (26, 'Rollen & Rechte: Profil-Anlage absichern (keine Admin-Rolle über direkten Insert)', 'wichtig'),

  (27, 'Barrierefreiheit: Formular-Beschriftungen mit den Feldern verknüpfen (131 Labels ohne htmlFor)', 'wichtig'),
  (28, 'Barrierefreiheit: Kontrast — gray-400 bei lesbarem Text ersetzen (317 Stellen)', 'wichtig'),
  (29, 'Barrierefreiheit: Erklärung ehrlich aktualisieren, Schlichtungsstelle nennen, externen BITV-Test einplanen', 'wichtig'),

  (30, 'Köln-Instanz: Erfundene Inhalte als Beispiel kennzeichnen oder entfernen (Fake-Konten, Zahlen, „In politischer Beratung“)', 'dringend'),
  (31, 'Köln-Instanz: Umfragen nicht als „Stadt Köln“ mit Verifiziert-Haken ausgeben', 'dringend'),
  (32, 'Köln-Instanz: „Pilotprojekt 2026“ und „offizielle Abstimmung“ entschärfen, solange Köln kein Partner ist', 'dringend'),
  (33, 'Köln-Instanz: Politiker-Reaktionsquote nicht von Hand setzen, Beispiel-Politiker mit echten Parteien und Angabe „Julie Cazier“ prüfen', 'wichtig'),
  (34, 'Köln-Instanz: Herkunft und Lizenz der Köln-Fotos und Porträts klären — falls KI, kennzeichnen (KI-VO Art. 50)', 'wichtig'),

  (35, 'Vertrieb: Kommunen nicht per Werbe-Mail kalt anschreiben (§ 7 UWG) — Brief oder individuelle Anfrage', 'dringend'),
  (36, 'Vertrieb: Politiker-/Partei-Funktionen für Kommunen-Instanzen abschaltbar machen (Neutralitätsgebot)', 'wichtig'),
  (37, 'Vertrieb: Keine bezahlten Partei-Umfragen, bevor die EU-Verordnung zu politischer Werbung (2024/900) umgesetzt ist', 'spaeter'),

  (38, 'Datenschutz: Videos behalten ihre Metadaten (evtl. GPS) — beim Hochladen entfernen oder serverseitig umwandeln', 'wichtig'),
  (39, 'Datenschutz: Autor-ID der Forderung und Nutzer-ID im Foto-Pfad sind weiter öffentlich (pseudonym) — ausblenden', 'wichtig'),
  (40, 'Code: Übergangs-Weg in lib/positions.ts entfernen, sobald Migration 044 eingespielt ist', 'spaeter')
) as t(n, text, prio)
where not exists (select 1 from public.todos x where x.text = t.text);
