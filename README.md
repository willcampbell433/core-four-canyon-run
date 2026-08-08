# The Fab Five Tuna Run

Active trip board for the August 8, 2026 tuna run from Manorside to Barnegat Ridge South, Barnegat Ridge North, and Seaside Lumps.

The complete July 3-4 canyon run remains available at [`archive/2026-07-03-canyon-run/`](archive/2026-07-03-canyon-run/).

Canonical production URL: [`https://ofishal-business.vercel.app`](https://ofishal-business.vercel.app). The Vercel alias is promoted only after the Supabase migration and public smoke tests pass.

## What it includes

- Trip clock and mission board
- Interactive Leaflet chart of the run (Esri Ocean basemap)
- Live wind/wave forecast from Open-Meteo, tides from NOAA
- Sunrise, sunset, and moon phase bite windows
- Crew cards, species guide, trip log, shared photo gallery, prep checklist
- Shared Supabase-backed trip status, destination, note, and realtime trip log
- Shared photo files in Supabase Storage with realtime metadata and public add/delete
- Durable offline write queue with visible synced, pending, and offline states
- Live bluefin status, permit, reporting, and safety links

The active Vercel board is intentionally public: anyone with the link can add, edit, or delete active-trip entries and add or delete trip photos without signing in. GPS remains local to each device and is not stored in Supabase.

Trip photo uploads are online-only. The browser validates and compresses images before sending them to Supabase Storage; image bytes are never placed in the trip log's local offline queue.

GitHub Pages remains available as a local only fallback. Without generated Supabase configuration it keeps entries in that browser and does not synchronize them.

## Local development

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`.

To test a production-shaped static build, set the browser-safe public values and build:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example \
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Never use a Supabase service-role key in the browser configuration. The build rejects credentials labeled as service role.

## Tests

```bash
npm run build
```

Rollback is a Vercel promotion to the previous known-good deployment. Supabase rows remain intact, and GitHub Pages continues serving the local-only fallback.
