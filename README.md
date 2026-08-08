# The Fab Five Tuna Run

Active trip board for the August 8, 2026 tuna run from Manorside to Barnegat Ridge South, Barnegat Ridge North, and Seaside Lumps.

The complete July 3-4 canyon run remains available at [`archive/2026-07-03-canyon-run/`](archive/2026-07-03-canyon-run/).

## What it includes

- Trip clock and mission board
- Interactive Leaflet chart of the run (Esri Ocean basemap)
- Live wind/wave forecast from Open-Meteo, tides from NOAA
- Sunrise, sunset, and moon phase bite windows
- Crew cards, species guide, trip log, photo gallery, prep checklist
- Live bluefin status, permit, reporting, and safety links

Static site hosted on GitHub Pages.

## Local development

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`.

## Tests

```bash
npm test
node --check app.js
node --check archive/2026-07-03-canyon-run/app.js
```
