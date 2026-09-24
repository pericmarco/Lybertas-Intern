-- Hakt die Rechts-Check-Todos ab, die am 24.09.2026 im Hauptprojekt behoben
-- wurden (Commit c5acf9f). Im SQL-Editor von lybertas-intern ausführen —
-- NACH rechtscheck-todos.sql und erst, wenn Migration 044 in der Datenbank
-- des Hauptprojekts eingespielt ist (sonst greifen die DB-Teile noch nicht).
-- Mehrfach ausführbar.

update public.todos
set done = true, done_at = coalesce(done_at, now())
where done = false
  and (
    (created_by = 'rechtscheck' and (
         text like 'Datenschutz: Profile vermutlich für alle Angemeldeten lesbar%'
      or text like 'Datenschutz: Nutzer-IDs von Positionen und Likes%'
      or text like 'Datenschutz: Demografie-Funktion der Umfragen%'
      or text like 'Datenschutz: Datenschutzerklärung — Fakten korrigieren%'
      or text like 'Datenschutz: Alter, Geschlecht und Stadtteil wirklich freiwillig%'
      or text like 'Datenschutz: GPS-/EXIF-Daten aus hochgeladenen Fotos%'
      or text like 'Datenschutz: Bei der Registrierung die aktuelle Version%'
      or text like 'Datenschutz: Festhalten, dass Städte nur zusammengefasste%'
      or text like 'DSA:%'
      or text like 'Rechtstexte:%'
      or text like 'Rollen & Rechte:%'
    ))
    or (created_by = 'fahrplan' and text like 'Vor Start: Datenschutzerklärung — Serverstandort%')
  );
