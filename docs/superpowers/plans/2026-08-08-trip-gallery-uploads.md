# Trip Gallery Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public, shared photo uploads and deletes to the existing Trip Gallery using the board's Supabase project.

**Architecture:** A new migration owns the `trip_photos` metadata table, the public `trip-photos` bucket, scoped anonymous policies, and realtime publication. A focused `photo-utils.js` module validates and compresses browser files; `app.js` adapts Supabase Storage and metadata operations to the existing gallery UI without adding image bytes to the offline text queue.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Supabase Postgres/Storage/Realtime, Node test runner, Vercel static deployment.

## Global Constraints

- Keep the Trip Gallery at the bottom of the active trip page.
- Add one public `Add photos` pathway in that gallery.
- Accept JPEG, PNG, WebP, and browser-decodable HEIC/HEIF inputs up to 20 MB.
- Resize the longest edge to at most 2,000 pixels and encode JPEG at 82% quality, with a 5 MB stored-object limit.
- Allow optional captions up to 240 characters and public delete.
- Photo uploads are online-only and never enter local storage or the existing offline mutation queue.
- Keep the built-in underway photo permanent and leave the July archive unchanged.
- Never expose a Supabase service-role credential in browser code.

---

### Task 1: Photo file preparation utilities

**Files:**
- Create: `photo-utils.js`
- Create: `tests/photo-utils.test.mjs`
- Modify: `scripts/generate-shared-config.mjs`
- Modify: `tests/build-contract.test.mjs`

**Interfaces:**
- Produces: `validatePhotoFile(file) -> { valid: boolean, error: string | null }`
- Produces: `buildPhotoPath({ tripSlug, id }) -> string`
- Produces: `preparePhoto(file, options?) -> Promise<{ blob, width, height }>` for browser upload code.

- [ ] **Step 1: Write failing tests for accepted types, rejected type/size, and deterministic path format**

Add Node tests importing the two pure functions and asserting the exact 20 MB boundary and `fab-five-2026-08-08/<uuid>.jpg` path.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/photo-utils.test.mjs`

Expected: FAIL because `photo-utils.js` does not exist.

- [ ] **Step 3: Implement validation, path generation, and browser compression**

Use exported constants for allowed MIME types, 20 MB source size, 5 MB output size, 2,000 pixel max dimension, and 0.82 JPEG quality. Decode with `createImageBitmap` when available and fall back to an object-URL-backed `Image`; draw to canvas; reject undecodable or oversized output with file-specific errors. Add `photo-utils.js` to the static build copy list and assert that contract.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/photo-utils.test.mjs && npm test`

Expected: PASS with no warnings.

- [ ] **Step 5: Commit**

```bash
git add photo-utils.js tests/photo-utils.test.mjs scripts/generate-shared-config.mjs tests/build-contract.test.mjs
git commit -m "WC-400 add photo preparation utilities"
```

### Task 2: Supabase photo schema, bucket, and policies

**Files:**
- Create: `supabase/migrations/20260808165500_trip_photos.sql`
- Modify: `tests/migration-contract.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Produces: `public.trip_photos(id, trip_id, storage_path, caption, width, height, created_at)`.
- Produces: public Storage bucket `trip-photos` with scoped anonymous select/insert/delete policies.

- [ ] **Step 1: Write failing migration contract tests**

Assert table columns and checks, 5 MB bucket limit, exact MIME allowlist, public table grants/policies, folder-scoped Storage policies, realtime publication, and no service-role key.

- [ ] **Step 2: Run the migration test and verify RED**

Run: `node --test tests/migration-contract.test.mjs`

Expected: FAIL because the photo migration does not exist.

- [ ] **Step 3: Add the idempotent migration and README behavior**

Create the table and trigger, enable RLS, grant anonymous select/insert/delete, create matching policies, upsert the bucket configuration, create `storage.objects` policies limited to `trip-photos/fab-five-2026-08-08/*`, and add the table to `supabase_realtime`. Document public photo writes and online-only uploads.

- [ ] **Step 4: Run migration and README contract tests**

Run: `node --test tests/migration-contract.test.mjs tests/readme-contract.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260808165500_trip_photos.sql tests/migration-contract.test.mjs README.md
git commit -m "WC-400 add shared photo storage schema"
```

### Task 3: Gallery controls and rendering

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `tests/shared-ui-contract.test.mjs`

**Interfaces:**
- Produces DOM IDs: `photoPicker`, `photoUploadPanel`, `photoCaptionInput`, `uploadPhotosButton`, `photoUploadStatus`, and `sharedPhotoList`.
- Consumes: photo rows rendered by Task 4.

- [ ] **Step 1: Write failing UI contract tests**

Assert the Add photos label/button, image-only multi-select input, optional 240-character caption, status region, upload button, shared list, permanent built-in photo, and unchanged July archive.

- [ ] **Step 2: Run the focused UI test and verify RED**

Run: `node --test tests/shared-ui-contract.test.mjs`

Expected: FAIL because the controls are absent.

- [ ] **Step 3: Add accessible gallery controls and responsive styles**

Place the control in the Trip Gallery heading, reveal a compact upload panel after selection, keep the static image first, and add responsive photo cards with fixed-ratio thumbnails, captions, timestamp, full-size link, and delete control styles.

- [ ] **Step 4: Run the focused UI test**

Run: `node --test tests/shared-ui-contract.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css tests/shared-ui-contract.test.mjs
git commit -m "WC-400 add trip gallery upload controls"
```

### Task 4: Supabase upload, realtime rendering, and delete flow

**Files:**
- Modify: `app.js`
- Modify: `tests/shared-ui-contract.test.mjs`
- Modify: `tests/site-contract.test.mjs`

**Interfaces:**
- Consumes: `validatePhotoFile`, `buildPhotoPath`, and `preparePhoto` from `photo-utils.js`.
- Produces client methods: `listPhotos(tripId)`, `uploadPhoto({ tripId, tripSlug, file, caption })`, `deletePhoto(photo)`, `photoUrl(path)`, and `subscribePhotos(handler)`.

- [ ] **Step 1: Write failing app contract tests**

Assert Storage upload/removal, metadata insert/delete, metadata cleanup after a failed insert, realtime `trip_photos` subscription, safe DOM text rendering, online-only status copy, confirmed delete, and no photo bytes in local storage.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/shared-ui-contract.test.mjs tests/site-contract.test.mjs`

Expected: FAIL because photo client and gallery wiring are absent.

- [ ] **Step 3: Implement the client adapter and gallery controller**

Load metadata newest-first, derive public URLs, reconcile realtime rows by ID, validate/compress selected files, upload objects followed by metadata, remove objects when metadata insertion fails, show partial progress, clear successful selections, and confirm public deletion. Use DOM node properties for captions rather than interpolated HTML.

- [ ] **Step 4: Run focused and full verification**

Run: `node --test tests/shared-ui-contract.test.mjs tests/site-contract.test.mjs && npm run build`

Expected: PASS and generated `dist/` contains the new module.

- [ ] **Step 5: Commit**

```bash
git add app.js tests/shared-ui-contract.test.mjs tests/site-contract.test.mjs
git commit -m "WC-400 wire shared trip photo gallery"
```

### Task 5: Database application, browser verification, and release

**Files:**
- Modify only if verification exposes a defect in files from Tasks 1-4.

**Interfaces:**
- Consumes: linked Supabase project, Vercel project, and the completed WC-400 branch.

- [ ] **Step 1: Run the complete local gate**

Run: `npm run build && git diff --check && git status --short`

Expected: all tests pass, syntax checks pass, build succeeds, and only generated ignored files remain.

- [ ] **Step 2: Apply and verify the Supabase migration**

Use the authenticated linked Supabase CLI to push only the pending migration. Verify a temporary compressed JPEG object plus metadata row can be created, publicly read, and deleted with the publishable key. Do not print credentials.

- [ ] **Step 3: Verify the browser flow locally**

Serve `dist/` on `127.0.0.1`, check desktop and phone widths, upload a test image, verify full-size view and realtime rendering, delete the test image, test an invalid file and offline state, and confirm no horizontal overflow.

- [ ] **Step 4: Push, open PR, merge to main, and deploy production**

Push `feat/wc-400-trip-photos`, open a WC-400 PR against `main`, merge after checks, and verify the Vercel production alias is Ready at `https://ofishal-business.vercel.app`.

- [ ] **Step 5: Run production smoke checks and close WC-400**

Verify root, shared config, module routes, July archive, Supabase photo read/upload/delete, and the live gallery. Leave one detailed Linear closing comment, set WC-400 Done, and remove only the WC-400 worktree/branch after the merge is confirmed.
