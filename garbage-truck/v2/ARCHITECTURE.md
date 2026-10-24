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
- Default minimum interval: 30 days.
- Run earlier only when a city announces a route/schedule change.
- `stale-if-error`: if upstream is down, keep the previous published JSON.
- Empty/partial fetches do not replace last-known-good output.

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

Route files carry stop-level schedules for:
- general garbage
- food waste
- recycling

City rules/advisories are separate from route schedules. V2 must not assume a Taiwan-wide weekday rule.

## Coordinates
MOENV schedule data can be useful even when coordinates are missing.
Those stops remain stored as schedule data with `lat/lng: null`.
They are excluded from map tiles until a local official source or a one-time cached coordinate resolver supplies coordinates.

## Front-end
The V2 preview has a 22-city selector.
Taipei/New Taipei currently inherit the existing tested static datasets.
Other cities can be imported incrementally without changing the page architecture.
