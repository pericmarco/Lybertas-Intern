-- Optional, nach Migration 003: übernimmt die Einordnung, die der Fahrplan selbst
-- schon trifft, für die importierten Todos. Alles andere bleibt ohne Farbe.
-- Mehrfach ausführbar ohne Schaden; von Hand gesetzte Farben werden nicht überschrieben.

-- Im Fahrplan als „jetzt dringend" bzw. „live falsch" markiert
update public.todos set priority = 'dringend'
where created_by = 'fahrplan' and priority is null
  and (text like 'Vertrag: Kommunal-Portal%' or text like 'Vor Start: Datenschutzerklärung%');

-- Im Fahrplan „bewusst aufgeschoben" (Später) bzw. „kein Eilprojekt" (App)
update public.todos set priority = 'spaeter'
where created_by = 'fahrplan' and priority is null
  and (text like 'Später:%' or text like 'App:%');
