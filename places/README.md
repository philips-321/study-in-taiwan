# Places near Taiwan hotels

This is a static, source-backed guide for useful places near the hotels supplied for Taiwan trips. It is separate from the site's other content areas and stores data as small JSON files; it does not use Cloudflare D1.

## Start here

- `index.html` — public index with language and distance filters.
- `data/manifest.json` — cities, hotels, categories, and data-file inventory.
- `data/hotels/index.json` — verified hotel identities and coordinates.
- `data/schema/place.schema.json` — record contract for attractions, photo spots, food, and practical stops.
- `TASK_LEDGER.md` — progress, decisions, blockers, and next research slice.
- `PROJECT_MEMORY.md` — durable handoff context for future scheduled runs.

## Evidence and publication rules

- Never invent a hotel, place name, coordinate, opening status, review date, or source.
- Keep source URLs and the date each source was published or checked on every record. Use multiple independent sources when available, including official pages and recent local-language coverage or posts.
- Prefer evidence from the previous 90 days for current activity. Older evidence may support background only; it cannot by itself establish that a business remains open.
- A place is `verified_active` only when the evidence supports its identity and current status. Otherwise keep it as `needs_review`, `status_unknown`, or `possibly_closed`, and label it clearly.
- Coordinates must resolve to the actual venue entrance or site point. Keep the exact Google Maps place URL (prefer a confirmed place ID) alongside coordinates; do not use an ambiguous name-only search link as a verified pin.
- `distance_m` is the great-circle distance from the hotel, rounded to the nearest 10 m. It is a radius distance, not a walking route. If a route estimate is shown, store it separately with its source and checked time.
- Link photographs to their original source and record the license/permission basis. Do not copy or hotlink a photo if its reuse terms are unclear.
- Store Indonesian, English, and Traditional Chinese labels separately. Preserve the venue's original/local name.
- Split JSON by hotel, radius, and category as it grows. Keep each page/index chunk small and load only the relevant files.
- Taichung recommendations must not assume MRT coverage. State the actual transport mode and verify current bus/transit details before presenting them.
- Group outings for 9–11 people should note capacity/reservation evidence where available; do not imply a venue can seat a group without support.

## Public page presentation

- Keep public copy focused on visitor decisions. Keep research workflow, implementation details (including static JSON and D1), raw hotel coordinates, and registry update logs in project notes/data, not page copy.
- Do not show the site/domain name in the upper-left header. Use a small `Places` link there.
- Keep the ID / EN / 繁中 language controls at the upper right on every page with the same styling and behavior. Do not move them to the bottom of a page.

## Current scope

Four starting hotels were supplied directly by the user and matched against Taiwan Tourism Administration records. Their official registry coordinates and hotel pages are recorded in `data/hotels/index.json`. Stay dates are kept as supplied because the month/year were not given. Nearby-place records are still being researched; no place distances have been guessed.
