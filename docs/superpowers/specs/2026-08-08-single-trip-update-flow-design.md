# Single Trip Update Flow Design

## Goal

Replace the separate live-trip editor and log-entry form with one obvious save path while keeping the Board Log at the bottom of the page.

## Interface

- Show the currently shared status, destination, and note in a compact read-only summary.
- Provide one form named `tripUpdateForm` with one update text field, status, destination, and entry type.
- Show method and angler only when the selected entry type is Tuna or Mahi mahi.
- Use one submit button labeled `Save to trip log`.

## Data flow

One submission creates a timestamped `trip_log_entries` row and updates `trip_state` with the selected status, destination, and the same update text as the current note. Non-catch updates infer `Running` while underway or heading home and `Other` otherwise. Catch updates use the selected method and optional angler.

Supabase persistence, realtime reconciliation, local fallback, and offline replay remain unchanged. A shared-store `saveTripUpdate` operation queues both mutations together in state-then-log order before replay so a flaky connection cannot save only half of the update.

## Error handling

Existing shared-store validation and sync errors remain visible beside the form. The form remains populated when either save fails and resets only after both operations complete without a shared-store error.

## Verification

- Contract tests prove there is only one form and one submit handler.
- Contract tests prove the same text updates both the shared state note and the log row.
- Contract tests prove catch details are conditional.
- Full tests, syntax checks, static build, and desktop/mobile browser inspection must pass.
