# Places task ledger

Last updated: 2026-10-28 (Asia/Taipei)

## Mission

Build the maintained, multilingual, source-backed `/places/` guide for selected hotels in Taiwan and useful nearby food, sights, photo spots, and practical stops. Keep the public content in static HTML and small JSON files, with no D1.

## Progress

- [x] Read repository instructions and preserve the `places/**` project boundary.
- [x] Create project memory and handoff rules for recurring runs.
- [x] Define a place record schema with coordinates, exact map URL, per-hotel distance, status, recent evidence, sources, and photo rights fields.
- [x] Create an accessible Indonesian/English/Traditional Chinese index shell and JSON manifest.
- [x] Establish four hotel areas and record their official names, addresses, and coordinates.
- [x] Verify hotel identity, address, and coordinates against Taiwan Tourism Administration open data.
- [x] Build the `/places/` index shell and four individual hotel pages in Indonesian, English, and Traditional Chinese.
- [x] Generalize public branding and remove itinerary order/date labels and requester notes from public HTML and hotel JSON.
- [x] Commit and push the initial guide to `main`; GitHub Pages reports a successful build with no error.
- [x] Revise the public UI to remove internal process copy and hotel coordinate metadata; align language controls at the upper right on every page.
- [ ] Verify exact Google Maps place identity/place ID for each hotel, in addition to coordinate-pin links.
- [ ] Build categorized/radius JSON chunks for places around each hotel.
- [ ] Research and verify current local recommendations, keeping evidence from the last 90 days where possible.
- [ ] Check place identities and map pins; add legal photo links/credits when available.
- [x] Link the four hotel pages and the first verified place from the `/places/` index.
- [ ] Add `/places/` URLs to the site sitemap.
- [ ] Continue reviewing source coverage, status labels, accessibility, and language switching as the guide grows.

## Coverage tracker

| City | Hotel | Hotel coordinates / map identity | 0–500 m | 501 m–1 km | >1 km / transit | Status |
|---|---|---|---:|---:|---:|---|
| Taipei · Wanhua | 東驛 E-HOUSE / E-house 155 | 25.045715, 121.5032553 · registry verified; Google place identity pending | 0 | 0 | 0 | Hotel verified; nearby research pending |
| Kaohsiung · Yancheng | 秝芯旅店駁二館 / Legend Hotel Pier 2 | 22.6220726, 120.2845067 · registry verified; hotel Maps identity pending | 1 | 0 | 0 | One food place verified; other categories pending |
| Taichung · Xitun | 享得道行旅 / In Joy Hotel | 24.1755637, 120.6504048 · registry verified; Google place identity pending | 0 | 0 | 0 | Hotel verified; nearby research pending |
| Taipei · Songshan | 承攜行旅台北八德館 / Guide Hotel Taipei Bade | 25.049007, 121.564132 · registry verified; Google place identity pending | 0 | 0 | 0 | Hotel verified; nearby research pending |

## Decisions

- Prioritize evidence published/updated within 90 days for whether a place is active. One- to two-year-old posts alone are not enough.
- A source can support a candidate but does not automatically prove the place is open now.
- Store hotel-relative straight-line distances; never label these as walking distance.
- Use exact Google Maps place URLs/IDs wherever verified; coordinates and name/address must agree.
- Taichung records need explicit transport checks; do not assume MRT or dependable bus coverage.
- Do not infer capacity for 9–11 people. Record a group-use note only when supported by source evidence.
- Use sources from any relevant language; show original title/name and keep ID/EN/zh-Hant display copy.
- Keep JSON chunks small by hotel, distance band, and category; one source catalog file can be shared by records.

## Current blocker / next action

Next bounded slice: Taipei · Wanhua · 東驛 E-HOUSE / E-house 155 · food and practical essentials · 0–500 m. Seek recent activity evidence, verify exact name/address/Google Maps place identity, then calculate straight-line distance. Keep public pages free of private itinerary dates and do not infer event schedules.

## Run log

### 2026-10-27

- Hotel identity, address, and coordinates were checked against official Taiwan Tourism Administration hotel records. Exact Google Maps place IDs for three hotels still need checking.
- Created `/places/` HTML index, bilingual/trilingual hotel pages, JSON manifest/hotel index, schema, project memory, and ledger.
- First research search found recent Ximending and Pier-2 sources and current Songshan park/tourism listings; place records are not yet published because coordinates and current activity status still need verification.

### 2026-10-28 · Kaohsiung/Yancheng · food · 0–500 m

- Added `data/kaohsiung-yancheng/within-500m/food.json` with one record: 港園牛肉麵 (Yancheng main store), address 803 高雄市鹽埕區大成街55號.
- Google Maps identity verified from two independent source links. Both resolve to CID `0x346e04784e98cf59:0xe425be744c375647`, feature `g/1tj71bg_`, coordinates 22.6210904, 120.2877845. Hotel-to-place great-circle distance: 350 m; walking route/time remain unverified.
- Recent activity evidence: 女子的休假計劃 visit article published 2026-09-14 lists the address and daily 10:30–20:00 hours, and describes the dining room as having limited tables. Official Kaohsiung Travel corroborates identity/address but its 2022-12-08 update is too old to establish current activity. Taiwan Foodie and a separate Google Maps link independently confirm the matching Maps identity.
- Status is `verified_active` based on the direct visit article within 90 days, checked 2026-10-28. Holiday hours need rechecking. No claim that 9–11 can sit together; no photo included because reuse terms were unclear.
- Updated the Legend Hotel page and Places index; added the data chunk to the manifest and updated coverage to 1 place / 1 verified active.
- Next: Taipei/Wanhua, E-House 155, food/practical, 0–500 m.
- Generalized all public `/places` branding: removed sponsor name, sequence numbers, stay date labels, and requester-specific notes from public HTML and hotel JSON.
- Committed as `2dfbc81` and pushed to `main`. GitHub Pages API reports status `built`, no build error, at 2026-10-28 00:11 Asia/Taipei. Production URL: `https://study-in-taiwan.com/places/`.
- Revised the public UI after review: removed hotel coordinate/registry lines, the process-method section, and implementation notes from visitor pages; removed the site name from the upper-left header; standardized the ID / EN / 繁中 selector at the upper right on the index and every hotel page. Language choice now persists across these pages.

- Generalized the public guide branding and removed requester-specific hotel order/date labels and traveler notes from the public HTML and hotel JSON before publishing.
