-- Dringlichkeit für Todos (Ampel): dringend / wichtig / spaeter, leer = nicht eingeordnet.
-- Mehrfach ausführbar ohne Schaden.

alter table public.todos
  add column if not exists priority text
    check (priority in ('dringend', 'wichtig', 'spaeter'));
