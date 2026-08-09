# Gallery and Trip Log UX Design

## Goal

Make trip updates comfortable to write and make the shared gallery contain only real trip uploads.

## Approved behavior

- Replace the one-line trip update input with a multi-line field.
- Accept up to 500 characters per update, matching the existing `trip_log_entries.moment` limit.
- Expand the shared trip-state note constraint to 500 characters so the single save flow remains atomic.
- Remove the permanent stock boat image from the gallery.
- Keep uploaded photos append-only and display them newest first.

## Data flow

The existing trip update form continues to save the same text to both `trip_state.return_note` and `trip_log_entries.moment`. A forward-only Supabase migration widens `return_note` from 160 to 500 characters. Gallery metadata remains in `trip_photos`; rendering continues to sort by descending `created_at`.

## Error handling and testing

Native `maxlength="500"` prevents oversized submissions in the browser, while the database constraint enforces the same boundary. Contract tests cover the multi-line field, the migration, removal of the stock image, and newest-first gallery ordering. Existing realtime, offline queue, upload, and append-only behavior remain unchanged.
