-- Kommunen-Status pro Gemeinde, verknüpft über den amtlichen Gemeindeschlüssel
-- (AGS, 8-stellig, aus BKG VG250). Ersetzt die alte Tabelle mit Klickpositionen.
--
-- Mehrfach ausführbar ohne Schaden: legt die neue Tabelle nur an, wenn sie
-- fehlt, und entfernt die alte nur, wenn sie noch existiert (darin standen nur
-- Testeinträge).

create table if not exists public.kommunen_status (
  ags text primary key check (ags ~ '^[0-9]{8}$'),
  name text not null,
  status text not null
    check (status in ('nicht_kontaktiert', 'angeschrieben', 'termin_vereinbart', 'gespraech_gefuehrt', 'kunde', 'abgesagt')),
  notes text,
  contact_date date,
  appointment_date date,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.kommunen_status enable row level security;

drop table if exists public.kommunen;
