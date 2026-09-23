-- Status auch für ganze Verwaltungsverbünde (Amt, Verbandsgemeinde, Verwaltungsgemeinschaft …).
-- Schlüssel: Gemeinde = 8-stelliger AGS, Verbund = 9-stelliger Gemeindeverbandsschlüssel (ARS-Stellen 1–9).
-- Mehrfach ausführbar ohne Schaden.

alter table public.kommunen_status
  add column if not exists ebene text not null default 'gemeinde';

alter table public.kommunen_status drop constraint if exists kommunen_status_ags_check;
alter table public.kommunen_status drop constraint if exists kommunen_status_ebene_check;
alter table public.kommunen_status add constraint kommunen_status_ebene_check check (
  (ebene = 'gemeinde' and ags ~ '^[0-9]{8}$') or (ebene = 'verbund' and ags ~ '^[0-9]{9}$')
);
