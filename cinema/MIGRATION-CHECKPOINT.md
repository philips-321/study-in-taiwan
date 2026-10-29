# Cinema canonical migration checkpoint

## Stage completed

The first migration stage is complete: schema contract and read-only inventory.

- Canonical schema: `data/canonical-screening-schema.json`
- Inventory tool: `scripts/inventory-showtime-data.mjs`
- Inventory command: `node cinema/scripts/inventory-showtime-data.mjs`
- Current input: 236 non-empty date/city JSON files
- Current rows: 11,929
- Current dates: 64
- Current cities: 19
- Malformed files: 0
- Rows missing required date/identity fields: 0
- Chunk date mismatches: 0
- Source values observed: 26

The inventory tool is read-only unless `--output=<path>` is supplied. It records each input file's byte count and SHA-256, plus row/date/city/source totals. No data was migrated, deleted, rewritten, or published in this stage.

## Stage 2 completed

The canonical converter is now implemented at `scripts/convert-to-canonical.mjs`. It is read-only by default and converts each legacy row into a canonical record with stable screening ID, source identity, provenance, parser version, and status. `--output-root=<directory>` writes monthly canonical JSONL partitions and an unresolved JSONL file outside the repository data tree.

Dry-run against the inventory input:

- input files: 236
- input rows: 11,929
- canonical rows: 11,929
- unresolved rows: 0
- months: 2026-01, 2026-10, 2026-11, 2026-12
- idempotence: two independent output runs were byte-identical

No legacy JSON was changed or deleted. The converter returns a non-zero status when unresolved rows exist, so ambiguity cannot silently pass into canonical output.

## Stage 3 completed

The rolling public materializer is implemented at `scripts/materialize-public-window.mjs`. It reads canonical monthly JSONL, emits only non-empty date/city JSON partitions, and writes a manifest with the retention range, row counts, file count, and SHA-256.

Dry-run for **2026-10-30 through 2026-11-29**:

- canonical input: 11,929 rows
- public rows: 3,835
- excluded by the 30-day window: 8,094
- non-empty public partitions: 146
- output checksum: `22c583ce159648eccd1b60730d622f6f0b6f845e18229d2f81361f6030848ea9`

The output was written only under `/tmp`; the repository's public JSON remains unchanged. This proves the size-bound view can be generated without deleting canonical records.

## Stage 4 completed

Reconciliation and edge-case tests are implemented:

- `scripts/reconcile-canonical-migration.mjs` checks input file/row conservation, unresolved handling, public-window bounds, and public output existence.
- `scripts/test-canonical-window.mjs` verifies today, the 30-day boundary, an out-of-window future date, and a prior date. It passed with 2 public rows and 2 excluded rows.
- Reconciliation against the real dry-run passed all checks: 11,929 input rows, 11,929 canonical rows, 0 unresolved, 3,835 public rows, and 8,094 outside the public window.

No production data has been replaced. The next stage is migration rehearsal against a temporary copy, followed by an explicit review of the generated diff before any repository file is changed.

## Stage 5 completed

Full migration rehearsal completed under `/tmp/cinema-migration-rehearsal`:

```text
inventory → canonical conversion → 30-day materialization → reconciliation → legacy validation
```

Results:

- legacy validator: passed, 11,929 rows / 265 films / 5,763 Taipei rows;
- inventory to canonical: 11,929 → 11,929 rows, 0 unresolved;
- reconciliation: all conservation and window checks passed;
- public view: 3,835 rows, 146 non-empty partitions, 30-day checksum stable;
- no production file was modified.

The next stage is a controlled repository migration plan: decide the canonical partition path and compatibility layer, generate a reviewable diff, and only then replace the legacy public view. Do not delete the legacy tree until the new view has passed the existing site renderer and all references have been updated.

## Stage 6 completed

The renderer compatibility audit found that `cinema.js` loads `data/showtimes/by-date/<date>/<city>.json` and expects the legacy `showtimes` payload plus fields such as `id`, `source_event_id`, `source`, `retrieved_at`, and `movie_id`. The materializer now maps canonical records back to that compatibility contract at the public-view boundary.

The full rehearsal and edge-case test were rerun after this change and passed. No application code or production JSON was replaced. The next step is a browser/render smoke test against the temporary materialized view, then a reviewable migration diff.

## Stage 7 completed

Static smoke checks passed:

- `cinema.js` syntax check passed;
- converter and materializer syntax checks passed;
- existing canonical validator passed (11,929 rows, 265 films, 5,763 Taipei rows);
- temporary canonical output size: 6.2 MB;
- temporary 30-day public output size: 2.4 MB.

The temporary public output is substantially smaller than the full legacy date tree while preserving all 11,929 rows in canonical partitions. Production replacement remains a separate migration commit so the diff can show exactly which old public dates leave the rolling view.

## Stage 8 completed

Canonical migration staging is now present in the repository:

- `data/canonical/2026-01.jsonl`
- `data/canonical/2026-10.jsonl`
- `data/canonical/2026-11.jsonl`
- `data/canonical/2026-12.jsonl`
- `data/canonical/manifest.json`
- `data/unresolved/records.jsonl`

The staged canonical store contains all 11,929 rows and zero unresolved rows. Every JSONL record parsed successfully and has a screening ID, business date, source ID, and provenance fields. The legacy `data/showtimes/by-date/` tree remains intact as the compatibility view while the renderer migration is completed.

## Stage 9 completed

Added `scripts/promote-public-window.mjs`. It validates the materialized manifest and every chunk's legacy renderer contract before promotion. Without `--confirm` it is dry-run only; promotion copies only non-empty rolling-window partitions and writes `PUBLIC-VIEW-MANIFEST.json`.

Dry-run passed for the current rehearsal: 146 files, 3,835 rows, window 2026-10-30 through 2026-11-29. The legacy production tree was not replaced.

## Stage 10 completed

The validated rolling view was promoted to the repository staging path:

```text
data/showtimes-public/by-date/
```

It contains 146 non-empty partitions, 3,835 screenings, and the promotion manifest. The directory is 2.5 MB. The application still reads the legacy path until its manifest/date-index compatibility update is completed; no public behavior changed in this stage.

## Stage 11 completed

The renderer now reads the staged rolling view:

- manifest: `data/showtimes-public/manifest.json`;
- partitions: `data/showtimes-public/by-date/<date>/<city>.json`;
- fallback to the legacy manifest remains if the staged manifest is unavailable;
- public rows remain in the existing renderer payload shape.

The 29 available dates and 3,835 rows were indexed successfully, and `cinema.js` syntax validation passed. The old `data/showtimes/by-date` tree is still retained for rollback; the next step is a local page smoke test and final public-build validation.
