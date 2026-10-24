# V2 refresh scripts

These scripts are deliberately manual-first.

- `collect_moenv.py --city <slug>`: fallback schedule collector. It caches source HTML, uses conditional requests where possible, splits output per route, and preserves last-known-good files when the upstream source fails.
- `compile_tiles.py --city <slug>`: builds small map tiles only from stops that already have coordinates.

The GitHub workflow `refresh-garbage-v2-city.yml` has `workflow_dispatch` only. There is no `schedule:`/cron trigger.

Default guard: 30 days. Refresh earlier only when a city announces changes.

Local official adapters should be preferred where they provide better coordinates or richer data. MOENV remains the nationwide fallback. Do not add a D1 dependency.
