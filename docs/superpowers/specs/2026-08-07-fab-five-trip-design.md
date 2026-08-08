# Fab Five August 8 Trip Board Design

## Objective

Make the August 8, 2026 Fab Five tuna trip the active Core Four trip board while preserving the complete July 3-4 canyon run as an easily browsable archive.

## Trip identity and schedule

- Name: The Fab Five
- Crew: John, Bill, Pete, Phil, and Will
- Boat: Ofishal Business
- Date: Saturday, August 8, 2026
- Departure: Manorside at 5:15 AM EDT
- Bridge target: Jordan Road bridge opening at 5:30 AM EDT
- Planned fishing route: Manorside, Barnegat Ridge South, Barnegat Ridge North, then Seaside Lumps
- Return time: intentionally presented as flexible rather than invented; the board will calculate route distance and underway estimates while making clear that actual fishing time and conditions control the return.

## Information architecture

The existing root page becomes the active Fab Five dashboard. The July 3-4 canyon page is copied intact into a dated archive directory and remains reachable from a visible Past Trip link. Relative asset and script paths in the archive are adjusted so its map, log, weather, photos, and styling keep working.

The active board retains the established single-page structure:

1. Mission summary and countdown
2. Five-person crew roster
3. Boat summary
4. Interactive route chart and location/ETA tools
5. Current marine weather, tides, sun, and moon data
6. Target-species notes
7. Fresh catch log and crew tally
8. Trip checklist and an archive link

## Data and behavior

- The August trip receives a unique local-storage key. July entries are never imported into the new trip.
- The active trip starts with only planning/departure milestones, not invented catches.
- Map waypoints and route geometry reflect the confirmed Ridge South, Ridge North, and Seaside Lumps order.
- Live NOAA/Open-Meteo feeds are updated to August 8 and the relevant nearshore/offshore area. Clear fallbacks remain if a feed is slow or unavailable offshore.
- Tide and daylight data use the most relevant dependable stations/endpoints available for the route, with source links and station labels shown in the UI.
- Distance and ETA figures are labeled as planning estimates, not navigation instructions.
- Official navigation, bridge operation, weather, and safety decisions remain with the captain and onboard instruments.

## Visual design

Keep the existing dark offshore visual language, compact cards, orange action color, seafoam status color, and mobile layout. Update identity copy to The Fab Five and emphasize the three fishing grounds. Do not redesign unrelated components or introduce a framework.

## Archive approach

The July page is preserved as static source under `archive/2026-07-03-canyon-run/`. This is preferred over Git-only history because it stays accessible to the crew, and over a shared-data refactor because tomorrow's trip does not justify expanding the architecture.

## Error handling

- Weather, buoy, tide, and location failures show useful fallback content instead of blank cards.
- Geolocation remains opt-in and reports denied/unavailable states.
- The log uses safe HTML escaping and continues to work without a network connection after page load.
- Archived and active local logs cannot overwrite each other.

## Verification

- Validate the active page and archive with a local static server.
- Check page identity, meaningful content, console errors, map rendering, log submission, copy-log action, and archive navigation.
- Capture desktop and mobile screenshots and check clipping, overlap, unreadable text, and first-viewport hierarchy.
- Run source-level checks for stale July labels, duplicate IDs, broken relative paths, and syntax errors.
- After publishing, verify GitHub Pages returns the new active page and the archived trip URL.

## Publishing

Commit the implementation on `feat/fab-five-20260808`, push it to GitHub, merge it into `main`, and verify the deployed site. This matches Will's request to update the Core Four GitHub and makes the new board available before departure.
