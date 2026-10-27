# Places project memory

## Mission

Build and maintain `https://study-in-taiwan.com/places/`: an Indonesian-first, source-checkable guide to food, attractions, photo spots, and practical places near selected hotels in Taiwan. Readers include travellers going out as a couple and groups of 9–11. The first UI languages are Indonesian, English, and Traditional Chinese.

## User requirements

- Research across languages and source types, including Google Maps and recent local/blog/social coverage.
- Recency matters: evidence from the last 90 days should be sought for activity/open status. Posts from 1–2 years ago alone are not sufficient.
- Every recommendation needs complete source links and last-checked/published dates.
- Store verified GPS coordinates and hotel-relative distances; make map links resolve to the right place.
- Include categories (food, sightseeing, photo spots, etc.), practical distance bands (within 500 m, within 1 km, farther), and transport notes for group outings.
- Taichung must be handled without assuming MRT is available/reliable.
- Keep records in small static JSON files; do not use Cloudflare D1.
- Produce crawlable HTML, a searchable `/places` index, and place/article pages as the corpus grows.
- Use photos when reuse is permitted and provide source/credit.
- Update `TASK_LEDGER.md` every work session so a future run can see what's complete, where, and what is next.
- Research is scheduled to continue hourly.

## Current state (2026-10-28 Asia/Taipei)

- Main repository: `/workspace/study-in-taiwan`, public domain `study-in-taiwan.com`.
- Read root `AGENTS.md`; keep work scoped to `places/**`. Do not change D1, hosting, DNS, or other sections as part of this work.
- Created this project memory, task ledger, initial data contract, manifest, and static HTML index.
- The guide currently covers four Taiwan hotel areas: 東驛 E-HOUSE / E-house 155 in Ximen, Taipei; 秝芯旅店駁二館 / Legend Hotel Pier 2 in Yancheng, Kaohsiung; 享得道行旅 / In Joy Hotel in Xitun, Taichung; and 承攜行旅台北八德館 / Guide Hotel Taipei Bade in Songshan, Taipei.
- Coordinates come from Taiwan Tourism Administration's lodging open-data JSON and are recorded with exact map links in `data/hotels/index.json`. E-House and Bade registry snapshots were last updated 2025-07-23; the official In Joy record was updated 2026-09-16; Legend was updated 2026-06-08. These hotel records establish identity/coordinates but are not recent evidence for nearby shops' current status.
- Created the index and four hotel pages. On 2026-10-28, added the first verified place record: 港園牛肉麵 (Gang Yuan Beef Noodle), 350 m straight-line from Legend Hotel Pier 2. It has a Google Maps CID match, a direct visit article dated 2026-09-14, and corroborating official tourism address information. No photo is used because reuse permission was not confirmed.
- Nearby research remains incomplete for all other radii/categories and hotels; the three other hotels have no place records yet. The hotel records still use coordinate-search Maps URLs rather than separately confirmed Google place identities.
- Public copy and hotel JSON have been generalized; they omit sponsor branding and itinerary order/date labels. Commit `2dfbc81` was pushed to `main` on 2026-10-28 Asia/Taipei. GitHub Pages reports the latest build as `built` with no error.

## Data policy

- See `README.md` and `data/schema/place.schema.json` for evidence and record rules.
- The stay date sequence has unknown month/year. Preserve the user's labels without inferring a calendar year or event date.
- Keep original Chinese names and aliases when verified; do not translate names in a way that breaks Google Maps search.
- Separate source publication date from date checked.
- Separate straight-line `distance_m` from route distance/time.
- Use explicit status labels; no recent evidence means unknown, not open or closed.
- Do not publish a photo until its reuse license/permission is clear.
- First bounded research slice recorded: Kaohsiung / Yancheng, Legend Hotel Pier 2, food, 0–500 m. Current active evidence is a local visit published 2026-09-14. The official Kaohsiung Travel page was updated 2022-12-08 and supports identity/address only, not current activity.
- For this place, Google Maps links from two independent sites resolve to the same CID `0x346e04784e98cf59:0xe425be744c375647`, feature `g/1tj71bg_`, at 22.6210904, 120.2877845. Stored distance is 350 m great-circle only; route distance/time are null.
- The recent local review describes few indoor tables. No verified 9–11-person capacity or reservation information was found, so the page does not promise group seating.
- Next bounded run: Taipei / Wanhua, E-House 155, food and everyday essentials within 500 m; validate exact place identity and recent activity before calculating distances.
