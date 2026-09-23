-- Einmaliger Import der offenen Punkte aus dem Fahrplan „Weg zur ersten
-- Kommune" (Stand 23.09.2026). Im Supabase SQL-Editor EINMAL ausführen —
-- mehrfaches Ausführen legt die Todos doppelt an. Liegt bewusst nicht in
-- migrations/, damit die GitHub-Integration es nicht automatisch ausführt.
--
-- Format „Bereich: Text" — das Dashboard gruppiert nach dem Teil vor dem
-- Doppelpunkt. Zeitstempel aufsteigend, damit die Reihenfolge erhalten bleibt.

insert into public.todos (text, created_by, created_at)
select t.text, 'fahrplan', now() - interval '1 second' * (100 - t.n)
from (values
  (1,  'Vertrag: Verantwortlicher-Frage klären (Lybertas oder Stadt verantwortlich, Option A/B)'),
  (2,  'Vertrag: Servicevertrag Dormagen fertigstellen (Rechtsform nach UG-Eintragung, § 9 nach Verantwortlicher-Frage, anwaltlich prüfen lassen)'),
  (3,  'Vertrag: Kommunal-Portal (/kommune) an echte Datenbank anbinden, inkl. Login-Pflicht — dringend für Dormagen'),

  (4,  'UG: Sitz festlegen und Geschäftsführer bestimmen'),
  (5,  'UG: Notartermin (Musterprotokoll)'),
  (6,  'UG: Geschäftskonto (UG i.G.) eröffnen und Stammkapital einzahlen'),
  (7,  'UG: Gewerbeanmeldung'),
  (8,  'UG: Finanzamt — steuerliche Erfassung über ELSTER'),
  (9,  'UG: Code, Domains und Marke von der GbR auf die UG übertragen'),

  (10, 'Vor Start: Vercel Pro abschließen (Hobby-Plan verbietet kommerzielle Nutzung)'),
  (11, 'Vor Start: Supabase Pro-Plan und AVV mit Supabase'),
  (12, 'Vor Start: AVV mit Vercel und dem E-Mail-Anbieter'),
  (13, 'Vor Start: E-Mail-Versand testen (Resend/IONOS ↔ Supabase) — Tobi'),
  (14, 'Vor Start: Wildcard-Domain *.lybertas.de einrichten (braucht IONOS-Zugang)'),
  (15, 'Vor Start: Vermögensschaden-/Cyberhaftpflicht — Angebote einholen'),
  (16, 'Vor Start: Backup einmal testweise zurückspielen'),
  (17, 'Vor Start: Datenschutzerklärung — Serverstandort korrigieren (Irland statt Frankfurt)'),
  (18, 'Vor Start: Entscheiden, ob die Produkt-Datenbank nach Frankfurt umzieht'),
  (19, 'Vor Start: Vercel-Serverregion des Hauptprojekts auf Frankfurt (fra1) stellen'),

  (20, 'Sollte: Storage aufräumen — Fotos/Videos beim Löschen wirklich entfernen'),
  (21, 'Sollte: Ende-zu-Ende-Test mit frischer Test-Stadt'),

  (22, 'Dashboard: intern.lybertas.de einrichten (IONOS-Zugang von Tobi)'),
  (23, 'Dashboard: altes Vercel-Projekt libertas-127z löschen'),

  (24, 'App: Konto-Selbstlöschung in der App bauen (Pflicht für beide Stores)'),
  (25, 'App: Store-Konten als Firmenkonto auf die UG (D-U-N-S nach Gründung)'),
  (26, 'App: Entscheiden, ob Push über Firebase kommt (Datenschutz, AVV)'),
  (27, 'App: iOS erst nach Android'),

  (28, 'Später: Fehler-Log in Supabase statt Sentry'),
  (29, 'Später: Secret-Scanning (gitleaks), sobald eine dritte Person Zugriff hat'),
  (30, 'Später: Public-Suffix-List-Meldung für lybertas.de'),
  (31, 'Später: CAPTCHA (Turnstile)'),
  (32, 'Später: Konto-Sperre nach Fehlversuchen (braucht Supabase Team-Plan)'),
  (33, 'Später: Multi-Faktor-Anmeldung'),
  (34, 'Später: Cookie-Hinweis'),
  (35, 'Später: Login über eigene Stadt-Domains (Cross-Domain-Auth)')
) as t(n, text);
