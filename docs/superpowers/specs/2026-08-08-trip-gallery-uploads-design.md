# Trip Gallery Uploads Design

## Objective

Turn the existing Trip Gallery into the one place where visitors view and add shared trip photos. Anyone with the public board URL can upload or delete photos without signing in, matching the board's existing collaborative model.

## User experience

- Keep the Trip Gallery at the bottom of the active trip page.
- Add one `Add photos` button in the gallery heading.
- The button opens the device file picker with image-only, multi-select input. Mobile browsers may offer the camera or photo library.
- After selection, show one optional caption field for the batch and an `Upload` action.
- Show per-batch progress text while files are prepared and uploaded.
- New photos appear in the existing gallery newest-first without a page reload.
- Each shared photo has its timestamp, optional caption, a full-size link, and a public delete action.
- Keep the existing underway photo as a permanent built-in gallery item without a delete action.

## Image handling

- Accept JPEG, PNG, WebP, and HEIC/HEIF selections when the browser can decode them.
- Reject non-image files and files larger than 20 MB before processing.
- Decode selected images in the browser, correct orientation through the browser decoder, resize the longest edge to at most 2,000 pixels, and export as JPEG at 82% quality.
- If the browser cannot decode a selected image, show a clear error for that file and leave the other selected files available to upload.
- Generate collision-resistant object names and store files under `fab-five-2026-08-08/<uuid>.jpg`.

## Supabase architecture

### Storage

- Create a public `trip-photos` Storage bucket.
- Limit stored objects to images and 5 MB after client compression.
- Allow anonymous select, insert, and delete only inside this bucket.
- Do not place service-role credentials in the browser.

### Metadata

Create `public.trip_photos` with:

- `id uuid primary key`
- `trip_id uuid` referencing `public.trips`
- `storage_path text unique`
- `caption text null` limited to 240 characters
- `width integer`
- `height integer`
- `created_at timestamptz`

Enable public select, insert, and delete through row-level security. Add the table to Supabase Realtime so uploads and deletes propagate to open boards.

## Data flow

1. The page loads the trip, live state, trip log entries, and photo metadata together.
2. The gallery maps each metadata row to the bucket's public object URL.
3. On upload, the browser validates and compresses each file.
4. The client uploads the object first, then inserts its metadata row.
5. If metadata insertion fails, the client removes the just-uploaded object to avoid an orphan.
6. On delete, the client removes the object first and then deletes its metadata row. A metadata deletion failure is shown and can be retried.
7. Realtime metadata events reconcile the gallery by photo ID.

Photo uploads are online-only. Unlike small text updates, image bytes are not queued in local storage because doing so is unreliable and can exhaust browser storage. The static gallery item remains available when Supabase is unavailable, and the upload control reports that a connection is required.

## Accessibility and layout

- Use a real label-backed file input, status region, and buttons with descriptive accessible names.
- Preserve keyboard access to upload, full-size view, and delete.
- Use responsive gallery cards with fixed aspect-ratio thumbnails to prevent layout shift.
- Keep controls usable at narrow phone widths without horizontal overflow.

## Error handling

- Validate type, original size, decoded dimensions, compressed size, and caption length before upload.
- Keep the selected batch visible after recoverable upload failures so the user can retry.
- Report partial success when some files upload and others fail.
- Confirm destructive deletion.
- Never claim an upload succeeded until both the object and metadata row exist.

## Testing and verification

- Contract tests cover the gallery control, metadata schema, storage bucket policies, allowed MIME types, size limits, realtime publication, and the absence of service-role keys.
- Unit tests cover image validation and object-path generation as pure functions.
- Browser checks cover mobile and desktop layouts, selection state, upload progress, shared rendering, full-size links, delete confirmation, and graceful offline behavior.
- Public Supabase smoke tests create, read, and delete a temporary photo object and metadata row.
- The existing 42 tests, syntax checks, build, archive, trip log, GPS, and responsive checks must remain green.

## Out of scope

- Authentication or per-user ownership
- Video uploads
- Photo editing, tagging, reactions, downloads, albums, or drag-and-drop sorting
- Offline image upload queues
- Changes to the July archive
