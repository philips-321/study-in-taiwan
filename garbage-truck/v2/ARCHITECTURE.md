# Garbage Truck V2 — Nationwide static architecture

V2 is intentionally static-first.

## Storage
- No D1.
- Published data lives as small JSON files under `garbage-truck/v2/data/`.
- Route schedules are split per route.
- Map points are compiled into small spatial tiles.
- Source responses may be cached locally during a manual refresh, but the website never queries MOENV or a city API at page load.

## Refresh policy
- No cron is created for the nationwide collector.
- Refresh one city/county manually.
- Before a full refresh, compare available source markers such as official update date, ETag, Last-Modified and/or content SHA-256.
- If the source has not changed, do not re-download/rebuild the full city dataset.
- Network retrieval is limited to two attempts per request.
- After two upstream failures, stop and set the normal retry point to the following Monday; a deliberate force run may override this.
- `stale-if-error`: if upstream is down, keep the previous published JSON.
- Empty/partial fetches do not replace last-known-good output.
- Keep source landing/download URLs and `source-history.json` so source changes can be compared over time.

## Source priority
1. Local official open-data/API when it has better route/coordinate coverage.
2. MOENV nationwide route database as the fallback schedule source.
3. Existing last-known-good JSON if upstream retrieval fails.

A provider saying its dataset updates daily does **not** mean V2 must fetch it daily.

## 22-city model
`data/cities.json` is the registry. Each city has its own manifest:
`data/cities/<slug>/manifest.json`

Each city may contain:
- `routes/index.json`
- `routes/<route-id>.json`
- `tiles/manifest.json`
- `tiles/<tile>.json`
- `rules.json`
- `source-history.json`

Route files carry stop-level schedules for:
- general garbage
- food waste
- recycling

City rules/advisories are separate from route schedules. V2 must not assume a Taiwan-wide weekday rule, and a Taipei-specific advisory must never be inherited by another city unless that city's own source is separately verified.

## Coordinates
MOENV schedule data can be useful even when coordinates are missing.
Those stops remain stored as schedule data with `lat/lng: null`.
They are excluded from map tiles until a local official source or a one-time cached coordinate resolver supplies coordinates.

## Front-end during testing
- The V2 preview temporarily has a 22-city selector for testing.
- The selector is marked test-only and hidden on small screens so it does not break the mobile header.
- The active city/county is shown after the localized map title, e.g. `Peta Truk Sampah · 臺北市 / Taipei`.

## Final front-end behavior
- Remove the city selector after all 22 datasets have been imported and verified.
- Determine the active city/county automatically from the user's location or the area currently being viewed on the map.
- Update the city label after the map title automatically when the active city changes.
- The map title follows the selected UI language; the city label keeps the official Traditional Chinese name and a localized/romanized companion label where appropriate.

Taipei/New Taipei currently inherit the existing tested static datasets. Other cities can be imported incrementally without changing the page architecture.
