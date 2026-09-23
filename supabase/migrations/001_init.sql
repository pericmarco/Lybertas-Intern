-- Eigenes Supabase-Projekt nur für das interne Dashboard, getrennt vom
-- Lybertas-Produkt. Im SQL-Editor des NEUEN Projekts einmal ausführen.
--
-- RLS ist aktiviert und hat absichtlich KEINE Policy: Über den öffentlichen
-- Anon-Key (und damit die automatische REST-API von Supabase) ist nichts
-- lesbar. Zugriff nur serverseitig mit dem Service-Role-Key, der RLS umgeht.

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

alter table public.todos enable row level security;

create table public.kommunen (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'nicht_kontaktiert'
    check (status in ('nicht_kontaktiert', 'angeschrieben', 'termin_vereinbart', 'gespraech_gefuehrt', 'kunde', 'abgesagt')),
  -- Position als Bruchteil (0..1) von Kartenbreite/-höhe, direkt aus dem Klick.
  pos_x numeric not null check (pos_x >= 0 and pos_x <= 1),
  pos_y numeric not null check (pos_y >= 0 and pos_y <= 1),
  notes text,
  contact_date date,
  appointment_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kommunen enable row level security;
