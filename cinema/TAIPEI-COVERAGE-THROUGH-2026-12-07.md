# Taipei cinema coverage through 2026-12-07

## Goal

Keep `/cinema` useful for a Taipei Airbnb guest through 2026-12-06, with **2026-12-07 as the hard maximum date shown in the UI**.

This is a display horizon, not a deletion horizon. Data after 2026-12-07 may remain stored for later reconciliation and must not be deleted merely because it is outside the current guest-planning window.

## Non-destructive policy

- Preserve the existing normalized Oracle-style cinema dataset.
- Preserve historical/unreferenced movie catalog records for later title matching.
- Preserve previously stored screenings unless a later reconciliation explicitly proves a duplicate or correction.
- New browser-reviewed snapshots are merged incrementally into `cinema/data/showtimes/by-date/<date>/taipei.json`.
- Official sources take precedence over clearly labelled fallback sources when the same screening identity is proven.
- Absence from a fresh fetch is **not** permission to delete an old movie or screening.
- The daily collector still rebuilds its temporary normalized snapshot, but the workflow merges collected rows into `cinema/data/canonical/YYYY-MM.jsonl` and regenerates the public rolling view from that durable archive. A missing row in a later fetch does not delete its canonical record.

## Display horizon

`cinema/cinema.js` limits selectable dates to `2026-12-07`. The repository intentionally retains stored data after that date, including existing 2026-12-16 Taipei rows.

## Current Taipei gap fill — 2026-11-01

Previously empty active venues were populated from reviewed official/browser sources where possible, otherwise from explicitly labelled dated fallback evidence. Reviewed snapshot files live under:

`cinema/data/research/snapshots/2026-11-01/`

Examples include Hala Cinema and LUX from official rendered pages, Century Asia Ximen from its official internal schedule endpoint, and dated fallback snapshots for venues whose official automated extraction was not yet stable.

## Verified closures retained in master

The following master records are retained but marked closed and ineligible for live recommendations:

- `新民生戲院` — closed 2026-01-31.
- `in89豪華數位影城` — Ximending venue closed 2026-05-31.
- `映捌玖數位影城有限公司` — duplicate/company master record for the same Ximending physical venue; closed 2026-05-31.

No record or historical screening was deleted when applying closure status.

Two zero-row company/legacy master records remain `unknown` and recommendation-ineligible rather than being falsely classified:

- `國元影業股份有限公司`
- `龍子電影事業股份有限公司（首都戲院）`

## Rolling publication reality

A complete schedule through 2026-12-07 cannot be truthfully prefilled on 2026-11-01 because cinemas publish future sessions on rolling schedules. Therefore the correct policy is:

1. show all already-published verified sessions now;
2. refresh Taipei sources progressively as new schedules are announced;
3. never fabricate unpublished future showtimes;
4. stop exposing dates after 2026-12-07 for this guest-planning window.

A recurring Taipei cinema refresh is scheduled for Wednesday and Friday evenings through early December so newly published sessions can be added without repeating this research manually.

## Validation baseline

Last validated branch state before merge:

- canonical validation: pass;
- total screening rows: 6,299;
- Taipei screening rows: 3,843;
- referenced films: 244;
- known direct/fallback overlap rows preserved for later matching: 6;
- existing post-horizon Taipei data (2026-12-16) still present.
