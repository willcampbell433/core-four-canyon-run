# Live Location Section Design

## Objective

Make live GPS tracking easier to find and use without changing the overall trip-board hierarchy or making tracking the page's dominant feature.

## Placement and Page Flow

Keep the existing section order and preserve the route map as the main feature of the run section. Move the tracker out of the map's right-hand notes column and place it in a dedicated, full-width section immediately below the route map and above the seafloor reference.

Add a `Live GPS` navigation link that anchors directly to the tracker. Keep the hero actions unchanged so the page still leads with the chart and conditions.

The resulting flow is:

1. Route map and route notes
2. Live Tracker
3. Seafloor reference and fishing grounds
4. Weather and the remaining trip-board sections

## Tracker Interface

The section uses the existing dark marine visual system, with a seafoam live-state accent and enough contrast to distinguish it from surrounding informational cards.

It contains:

- An eyebrow label and heading identifying the section as live GPS for *Ofishal Business*
- A short explanation that tracking follows the device currently viewing the board and plots that position on the chart above
- A visible state badge for `GPS OFF`, `CONNECTING`, `LIVE`, `PAUSED`, or `GPS ERROR`
- One primary action button that toggles between starting and stopping live location
- A prominent status readout containing coordinates and GPS accuracy once available
- Separate speed/course and distance/ETA readouts for quick scanning underway
- A note that the board is not a navigation chart and the boat's chartplotter remains authoritative

The section must remain useful before permission is granted. Initial readouts explain what will appear after tracking starts rather than showing empty values.

## Behavior and Data Flow

The browser Geolocation API remains the sole position source. No backend, remote boat feed, or shared tracking is introduced.

When the user starts tracking:

1. The state changes to `CONNECTING` while the browser requests permission and a fix.
2. Each GPS update refreshes the tracker readouts.
3. The existing Leaflet boat marker, accuracy circle, and trail update on the route map.
4. The first fix fits the route and current position into view; subsequent fixes pan the map.
5. Distance and ETA continue to use Seaside Lumps as the planned final destination.

When tracking stops, the state changes to `PAUSED`, the existing trail remains visible, and the button returns to its start label.

## Error Handling

- Unsupported browsers show `GPS ERROR` and explain that location is unavailable.
- Denied permission shows `GPS ERROR` and tells the user to enable location access in the browser.
- Temporary position failures keep the watch active, show `GPS ERROR`, and explain that the app is still trying to recover the fix.
- Missing speed or heading data displays a clear waiting state rather than fabricated values.
- Existing map-library failure behavior remains intact; the tracker reports that the chart is unavailable while the rest of the board continues to work.

## Responsive Design

On desktop, the introductory copy and controls form a balanced two-column panel, followed by three scan-friendly readout cards. On mobile, all content stacks, the action button becomes full width, labels wrap cleanly, and no tracker content overlays the map.

## Accessibility

- Use a real section landmark with an anchored heading.
- Announce changing GPS status through an `aria-live` region without repeatedly announcing decorative content.
- Preserve button keyboard behavior and visible focus treatment.
- Do not rely on color alone for tracker state; every state includes text.
- Respect reduced-motion preferences for any live pulse treatment.

## Verification

Run the repository's existing tests and JavaScript syntax checks. Render-test the live page locally at desktop and mobile widths, checking:

- Navigation anchor lands on the tracker section
- Tracker is visually distinct but secondary to the route map
- Start action reaches the connecting state
- A mocked successful GPS fix produces live coordinates, accuracy, marker, trail, speed/course when supplied, and distance/ETA
- Stop action produces the paused state and preserves the trail
- Permission-denied and unsupported-browser states are understandable
- No framework overlay, relevant console errors, clipping, overlap, or mobile horizontal scrolling appears

## Out of Scope

- Shared or persistent remote boat tracking
- Authentication, accounts, or a hosted datastore
- Reordering the crew, vessel, weather, fish, log, or gallery sections
- Changing the planned route, destination, weather feeds, or trip data
