# Lybertas — Intern

Internes Dashboard für Marco und Tobi: Todo-Liste und Kommunen-Akquise-Karte.
Komplett getrennt vom Lybertas-Produkt: eigenes Repo, eigenes Vercel-Projekt,
eigenes Supabase-Projekt.

## Setup (einmalig)

1. **Supabase:** neues Projekt anlegen, im SQL-Editor
   `supabase/migrations/001_init.sql` ausführen.
2. **Vercel:** neues Projekt aus diesem Repo importieren (Root Directory bleibt
   leer), Environment Variables aus `.env.example` setzen:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` aus dem neuen Supabase-Projekt
     (Project Settings → API). Der Service-Role-Key ist geheim und bleibt
     ausschließlich serverseitig.
   - `SESSION_SECRET`: langer Zufallsstring, z. B. `openssl rand -base64 32`.
   - `INTERN_PASSWORD_MARCO`, `INTERN_PASSWORD_TOBI`: je ein festes Passwort.
3. **Domain:** `intern.lybertas.de` im Vercel-Projekt eintragen, den
   angezeigten CNAME bei IONOS anlegen.

## Karte

„+ Kommune hinzufügen", dann auf die Karte klicken, wo die Kommune liegt. Die
Position wird direkt aus dem Klick übernommen, kein Geocoding.
Kartenumriss: [svg-maps.com](https://svg-maps.com) (CC BY 4.0), siehe
`public/germany-map-LICENSE.md`.
