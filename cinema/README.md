# Taiwan Cinema / Showtime Collector

Read [USER-RULES.md](USER-RULES.md) first before any cinema work, then read this file. Manual source research must use a browser one cinema at a time; the user-authorized API refresh workflow cannot replace that research.

## Browser experience

For source completion, open each cinema source in a browser one at a time. Record source URLs, observed fields, and access/rendering issues in `SOURCE-RESEARCH-NOTES.md`, `SOURCE-RESEARCH-LIST.csv`, and `data/research/observed-sources.json`. GitHub Actions must never browse cinema pages or perform manual source research. The existing scheduled API refresh may update the static snapshot with its configured endpoints and must follow the city failure policy below.

### City refresh failure policy

`update-cinema-data.yml` treats a city summary/count integrity mismatch as a city-level refresh failure. It records at most one failure per Taiwan calendar day in `.github/cinema-city-update-health.json`. The first failed day is reported while other cities continue. After failures on two consecutive Taiwan dates, that city's cinema and showtime JSON stays at its last-known-good version; date/city indexes and the manifest are rebuilt around it, and the GitHub Actions run summary lists it for manual browser research. Other cities continue through the refresh.

The hold is deliberate and persists until manual browser research fixes the city's records. In the same change that records verified data, remove that city's entire entry from `.github/cinema-city-update-health.json` so the next scheduled refresh can resume it. A missing schedule alone is not a city failure and must never be interpreted as a cinema closure. The source collectors may still fetch a nationwide feed once; the held city's output is restored from its last-known-good files and excluded from the refreshed snapshot.

City counts must be checked against the durable date/city chunks. Per-city status files intentionally have an empty `showtimes` array, so that array must never be used to set `manifest.cities[*].showtimes`.

Use [SOURCE-RESEARCH-LIST.md](SOURCE-RESEARCH-LIST.md) for clickable source-search and map links for all 107 cinema records. Record inspected pages and limitations in [SOURCE-RESEARCH-NOTES.md](SOURCE-RESEARCH-NOTES.md), and put the best confirmed source link in [SOURCE-RESEARCH-LIST.csv](SOURCE-RESEARCH-LIST.csv).

`cinema/index.html` is the public cinema browser. It loads static JSON files below `data/` and individual OSM venue points from `data/locations.json`; the visitor's browser never calls cinema schedule APIs. Browser caching follows the static host's cache headers. Pins sit at their source coordinates, never at a city center; matched pins open the cinema record and the selected day's screenings. BAMID names, company, address, phone, and screen count are shown when available. A location can include an optional `image_url` for a sourced building photo.

The location button puts the map at the browser's exact reported coordinates (zoom 15.6) and selects the nearest city for the list. The date navigator includes only dates from Taiwan's current date onward; the previous-date control is locked. Search matches Chinese and international movie titles, including HTML-encoded punctuation and curly/straight apostrophes. A film title opens a detail card with the catalog poster, international title, genres, and age rating when supplied; missing metadata is labeled as unavailable. Keep `subtitles: null` distinct from an explicit subtitle language: null means the source did not provide verified subtitle information. Movie, audio, and explicitly verified subtitle filters remain available, as do English, Traditional Chinese, Indonesian, Japanese, Korean, Vietnamese, and Thai UI languages and dark/light themes.

The annual BAMID master has no coordinates. The current location snapshot has 92 individual map points, 53 linked to 107 BAMID records. The rest are OSM cinema points without a linked schedule record; BAMID venues still lacking a verified point remain in the address list without a pin. The points are a useful visible baseline, not full coverage. OSM attribution is shown on the map. Building photos are only shown when a sourced image URL exists; no photos are present in the current BAMID data.

The current cinema dataset has `movie_title` and sometimes `movie_title_en`; it does not contain per-country title translations. The UI labels `movie_title_en` as the international title when supplied and does not derive localized titles from the interface language. Search normalizes HTML entities, Unicode punctuation, and case on both the query and titles. Explicit subtitle coverage is sparse, so subtitle search must leave unknown values unclassified rather than inferring them from audio language.

Ticket prices are stored separately under `data/ticket-prices/`, split by city. The browser loads a city's small price file only when a visitor opens a priced cinema's ticket-price section. The data includes a dated ShowTimes bootstrap snapshot for 15 秀泰 branches; these are not live checkout quotes.

This project is an ongoing maintained data pipeline, not a project with a meaningful completion percentage. Upstream cinema sites will change and adapters will need patching over time.

## Current coverage gaps

There is no single public API/database here that provides all brands and all 22 city/county areas. The active ShowTimes bootstrap covers only its 15 branches. VieShow required 20 official branch pages to be reviewed individually; it is stored as a manual snapshot. Future rows are currently present in 15 areas and absent in Hsinchu County, Nantou, Chiayi County, Yilan, Penghu, Kinmen, and Lienchiang. Continue researching the other mapped chains and unlinked venues; do not infer that an area or cinema is closed from missing schedules.

## Goal

## Chat handoff and manual data updates

For a new chat, read `USER-RULES.md`, this README, the current git branch, `data/manifest.json`, `SOURCE-RESEARCH-NOTES.md`, and `data/research/observed-sources.json`. Continue the source tracker; do not restart research.

The site serves static JSON so all visitors reuse the same saved data; the browser must not call a schedule API per visit. Keep browser caching enabled and keep the JSON normalized and split by city and date. Store each movie's titles and available metadata once in `data/movies/index.json`; date/city screening rows reference its `movie_id`. Manually researched poster links and their official source pages are tracked in `data/research/movie-posters.json`.

Manually add screenings only after opening that cinema's source and confirming the date, title, time, and any explicitly declared audio/subtitle or format details. Cite the source URL on each row. Do not treat a legacy importer or scheduled workflow as the collection method. Leave unknown metadata null. Keep posters as reused URLs, use lazy loading, and never embed poster image bytes in JSON. Genre and age-rating values come from the source or an exact existing movie record, not guesses.

Coverage fields ending in `_rows` count individual screenings. Latest saved-data audit (2026-10-27): 7,075 screening rows refer to 226 deduplicated films; 7,031 are dated today or later across 55 dates, through 2026-12-31. This includes 2,152 active events from the official ShowTimes bootstrap across 15 branches, plus 2,774 sessions manually reviewed in the browser across 20 VieShow branches. ShowTimes data runs through 2026-12-22; VieShow's published branch schedules run through 2026-12-16. ShowTimes supplies posters, genres, age ratings, runtimes, hall names, formats, and explicit audio labels; VieShow supplies international titles, times, formats, and audio labels. Neither source provides verified subtitle languages in these records. Across the catalog, 118 films have an international title, 88 have a poster (80 distinct poster URLs), 64 have genres (16 genre codes), and 69 have a recognized age rating. Explicit subtitles appear on 79 screenings. Future showtime rows exist in 15 of the 22 official city/county areas and link to 50 BAMID records; seven areas have no future indexed rows: Hsinchu County, Nantou, Chiayi County, Yilan, Penghu, Kinmen, and Lienchiang. That is missing source coverage, not evidence of closure. Eight venues with future rows do not link to BAMID records. The ShowTimes API is one chain's feed, not a nationwide all-brand database. Remaining nulls are unknown, not guessed. Ticket price snapshots cover 15 ShowTimes branches; other chains need their own verified sources.

Legacy import and fallback scripts remain in the repository as historical implementation details. Do not trigger or rely on their GitHub workflow for cinema updates; follow `USER-RULES.md`.

Maintain current Taiwan cinema/showtime data as fixed per-city JSON files for `study-in-taiwan.com`, without Cloudflare D1 while static JSON is sufficient.

Published files are overwritten in place:

```text
cinema/data/cinemas/<city>.json
cinema/data/showtimes/<city>.json
cinema/data/showtimes/by-date/<date>/<city>.json
cinema/data/manifest.json
cinema/data/ticket-prices/index.json
cinema/data/ticket-prices/<city>.json
```

`data/showtimes/by-date/<date>/<city>.json` is the only durable store for screening rows. Each screening stores a `movie_id`; the film's titles, poster URL, genres, age rating, runtime, and metadata sources live once in `data/movies/index.json`. Cinema names resolve through `cinema_id`. Per-city `data/showtimes/<city>.json` files contain source health and a count only; they must not duplicate screening rows. The browser reads only the selected date/city chunks and resolves movie metadata through the catalog, avoiding per-screening copies in both JSON and browser row objects.

The older fallback workflow is documented in the historical adapter notes only. For the user's manual update process, preserve the existing date/city chunks and edit only records confirmed by browser sources. Git history is the audit/history layer. Keep `movie_id` stable for an existing film; distinct start times, halls, formats, and cinemas remain separate screening rows.

The 2026-10-24 normalization pass retained 10,070 screening rows across 293 referenced movie identities at that time; later refreshes replace and extend that snapshot. The catalog contains only films referenced by a screening, not extra program listings with no current showtime. It consolidated repeated poster URLs to 64 and repeated the movie metadata only once per catalog entry. JSON storage for showtime files dropped from about 13.7 MB to about 5.2 MB including the catalog and small city status files. These byte savings reduce transfer and parsed row overhead; actual browser memory also depends on map tiles, images, and rendering.

## Historical adapter and source notes

The table and adapter documentation below describe earlier implementation work. They are reference material only, not instructions to run automation or a statement that a source is currently complete. Follow the manual-browser rule above for new data.

| Source | Method | Current status | Notes |
|---|---|---|---|
| BAMID national cinema master | Official metadata endpoint -> newest annual CSV | WORKING | Stable cinema identity/master data, not showtimes |
| Ministry of Culture movie API | Official JSON API | WORKING but sparse | Latest saved snapshot has 270 rows total, including 268 future rows; supplemental cultural/event screenings only |
| Miramar / 美麗華大直 | Official booking API | WORKING | Best source quality; direct structured JSON |
| Ambassador / 國賓 | Official TheaterList + per-theater/per-date HTML | WORKING | Parallel fetch + retry; title parser fixed |
| SPOT Huashan / 光點華山 | Official schedule HTML table | WORKING | 79 rows in verified run; preserves C/E subtitle metadata |
| ShowTimes / 秀泰 | Official bootstrap JSON + cinema pages | Live bootstrap JSON verified 2026-10-27; scheduled GitHub collector may still receive 403 | Imported 2,152 active events for 15 branches from the live bootstrap, 2026-10-27 to 2026-12-22; stored in normalized date/city JSON |
| Eslite Art House / 誠品電影院 | Official schedule HTML | BLOCKED from GitHub Actions | Parser exists, but runner gets HTTP 403 |
| AtMovies Taipei fallback | Aggregator HTML by cinema/date | WORKING fallback | Used only for gaps where official automation is blocked/incomplete |
| Vie Show / 威秀 + MUVIE | Official branch pages manually reviewed in browser | Manual snapshot active; 2,774 sessions across 20 branches; no GitHub Action browser collection | Manually refresh and retain as last-known-good; AtMovies remains a Taipei fallback |
| Wonderful / 真善美 | Official stable automation not yet integrated | FALLBACK ACTIVE | AtMovies fallback currently used |
| SPOT Taipei / 光點台北 | Official stable automation not yet integrated | FALLBACK ACTIVE | AtMovies fallback currently used |
| in89 Taipei Ximending | Official site identified (`TheaterId=3`) | RESEARCH ONLY | Client-rendered; stable underlying data endpoint not yet identified |

## 1. Official cinema master: BAMID

Used by `cinema/scripts/update-cinema-data.mjs`.

Metadata endpoint:

```text
https://www.bamid.gov.tw/OpenData.aspx?SN=E6C57FC155564DEB
```

Method:

1. Fetch BAMID metadata JSON.
2. Extract all annual CSV links from `相關檔案`.
3. Sort by year descending.
4. Use newest CSV.
5. Normalize every cinema into a stable per-city master record.

Latest verified state on 2026-10-24:

- selected official master year: 2025
- raw master rows: 107
- Taipei master cinema records: 30

Important: annual BAMID data can lag real-world closures. Missing showtimes MUST NOT be interpreted as `closed`.

Operational status policy:

- fresh matched showtime -> `active`, `recommendation_eligible=true`
- no fresh showtime evidence -> `unknown`
- `closed` requires separate current authoritative evidence

## 2. Ministry of Culture movie/event API

Endpoint:

```text
https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=8
```

Method: direct JSON fetch inside the main updater.

Status: works, but it is not a commercial cinema showtime feed. It is useful mainly for cultural/festival/event screenings.

Do not treat it as nationwide commercial coverage.

Latest saved snapshot reports 270 event rows total, including 268 future rows. This is expected: the API is a supplemental cultural/event feed, not a commercial-cinema timetable for all cities.

## 3. Miramar / 美麗華大直 — WORKING OFFICIAL API

Adapter:

```text
cinema/scripts/sources/miramar.mjs
```

Endpoint:

```text
POST https://www.miramarcinemas.tw/api/Booking/GetMovie/
Content-Type: application/json
Body: {}
Referer: https://www.miramarcinemas.tw/booking/timetable
```

Response path used:

```text
payload.results.mMovies
  -> movie.mShowTimes
  -> day.mCinemas
  -> cinema.mSessions
```

Extracted fields include:

- movie title
- English title where supplied
- rating
- date/time
- hall/cinema title
- session format

Latest verified count: 355 showtimes.

This is currently the cleanest adapter. Do not replace it with HTML scraping unless the API stops working.

## 4. Ambassador / 國賓 — WORKING OFFICIAL HTML

Adapter:

```text
cinema/scripts/sources/ambassador.mjs
```

Discovery page:

```text
https://www.ambassador.com.tw/home/TheaterList
```

Method:

1. Parse `TheaterList` for theater UUID, name and address.
2. Resolve city from address.
3. Request each theater/date page:

```text
https://www.ambassador.com.tw/home/Showtime?ID=<theater-uuid>&DT=YYYY%2FMM%2FDD
```

4. Parse `<div class="showtime-item">` blocks.
5. Parse `<p class="tag-seat">` for version/format and Chinese movie title.
6. Parse session `<h6>` time and hall information.
7. Infer `audio_language` only from explicit version labels such as:
   - 英文版 -> `en`
   - 日文版 -> `ja`
   - 韓語版 / 韓文版 -> `ko`
   - 中文版 / 中文配音 -> `zh`
   - 法語版 / 法文版 -> `fr`

Important history:

A previous regex used a lazy title capture and produced one-character movie titles (`泥`, `進`, `惡`, etc.). That bug was fixed. The current parser gets the title from the version/showtime block and uses the heading only for an English-title candidate.

Verified examples after fix:

- `泥面人`
- `進擊的鼓手 4K重映`
- `惡靈古堡：爆發夜`

Performance/reliability:

- fetches are parallelized with `CONCURRENCY = 8`
- transient 5xx/network errors are retried
- do not remove retries: parallel requests previously exposed intermittent HTTP 500 responses

Latest verified run after retry patch: 2,683 Ambassador showtimes.

## 5. SPOT Huashan / 光點華山 — WORKING OFFICIAL HTML

Adapter:

```text
cinema/scripts/sources/spot-huashan.mjs
```

Official schedule:

```text
https://www.spot-hs.org.tw/movie/schedule.html
```

Important parser history:

The first parser assumed date/title/time metadata could be recovered reliably as simple text lines. That failed with zero rows.

A second line-oriented patch also failed because the actual HTML separates schedule fields across table cells.

Current working method:

- parse the actual `<tr>/<td>` table structure
- identify date, time, Chinese title, English title, runtime, subtitle code and rating from cells
- carry date forward for rows that omit repeated date cells

Subtitle normalization:

```text
C   -> ["zh"]
E   -> ["en"]
C/E -> ["zh", "en"]
E/C -> ["zh", "en"]
```

This source is strategically important because it can explicitly prove English subtitles for non-English films.

Latest verified run: 79 official SPOT Huashan showtimes.

Do not go back to the old line parser unless the upstream markup changes again.

## 6. ShowTimes / 秀泰 — OFFICIAL BOOTSTRAP FEED

Adapter:

```text
cinema/scripts/sources/showtimes.mjs
```

Official URL pattern:

```text
https://www.showtimes.com.tw/cinemas/<id>/
```

The page parser can extract:

- movie title
- date
- session time
- format
- explicit spoken language label when present

The live public bootstrap endpoint is:

```text
https://capi.showtimes.com.tw/4/app/bootstrap
```

It includes 15 ShowTimes corporations, venues, active events, and program records with alternative/international titles, genre codes, age-rating codes, runtimes, and poster URLs. A sequential browser review on 2026-10-27 opened all 15 official branch pages. Thirteen rendered their schedule within the first wait; 台北欣欣秀泰影城 and 大巨蛋秀泰影城 needed a longer wait. The official bootstrap API returned 2,152 active events across 15 branches in 10 cities, dated 2026-10-27 through 2026-12-22. This is a dated snapshot, not a guarantee that every future schedule is already published. Subtitle languages are not supplied in these API records and stay unknown.

For a manual refresh, open/review the ShowTimes branch pages one by one, download the public bootstrap JSON, then run `node cinema/scripts/import-showtimes-bootstrap.mjs <bootstrap.json> YYYY-MM-DD`. The importer replaces only ShowTimes rows, preserves other-source screenings, deduplicates movie metadata in `data/movies/index.json`, and writes screenings to date/city chunks. Keep ShowTimes events in date/city chunks only; the fallback workflow also restores from those chunks.

Problem:

The scheduled GitHub Actions collector currently receives:

```text
403 Forbidden
```

from the public bootstrap API, while browser requests from the manual research environment succeed. This currently blocks automated refresh of this source from GitHub Actions, not manual browser/API review.

This is an access/WAF problem, not currently a parsing problem.

Do not spend time repeatedly rewriting the parser unless the HTTP response changes from 403 to a normal page. First test whether the runner can fetch the page at all.

## Vie Show / 威秀 — MANUAL BROWSER SNAPSHOT

Official venue directory:

```text
https://www.vscinemas.com.tw/theater/index.aspx
```

Each official branch page publishes date tabs and HTML schedule blocks. On 2026-10-27, the 20 listed branch pages were opened one at a time in a browser and yielded 2,774 upcoming sessions through 2026-12-16. The saved fields are date, Chinese/international title, time, format, and explicit audio label. The pages do not expose verified subtitles or hall numbers. Keep those fields unknown.

The collected page data is imported with `cinema/scripts/import-vieshow-browser-snapshot.mjs`. The scheduled GitHub Action does not browse VieShow pages. It preserves the manually reviewed schedule rows as last-known-good data until the next manual browser review; the importer replaces only rows from this source and keeps the per-date/per-city JSON model.

This is not a nationwide cinema feed. The official directory has no single schedule export for every Taiwan cinema, and a VieShow snapshot does not cover unrelated companies.

## 7. Eslite Art House / 誠品電影院 — OFFICIAL PARSER EXISTS, GITHUB RUNNER BLOCKED

Adapter:

```text
cinema/scripts/sources/eslite.mjs
```

Official schedule URL:

```text
https://meet.eslite.com/tw/tc/gallery/movieschedule/201803020001?v=1
```

The public page contains valuable metadata:

- Chinese/English title
- rating
- runtime
- subtitle declaration
- weekly date/time schedule

Parser normalizes explicit subtitles, including:

```text
中/英 -> ["zh", "en"]
中文  -> ["zh"]
英文  -> ["en"]
```

Problem:

GitHub Actions currently receives:

```text
403 Forbidden
```

The adapter remains in the pipeline so source health records the failure explicitly.

Do NOT remove Eslite from AtMovies fallback while the official source is 403 from the runner.

## 8. AtMovies Taipei fallback — WORKING FALLBACK

Adapter:

```text
cinema/scripts/sources/atmovies-taipei.mjs
```

URL pattern:

```text
https://www.atmovies.com.tw/showtime/<cinema-code>/a02/YYYYMMDD/
```

Current target codes:

```text
t02a01  台北信義威秀影城
t02a11  MUVIE CINEMAS 台北松仁
t02a12  台北南港LaLaport威秀影城
t02b14  台北京站威秀影城
t02b08  台北西門威秀影城
t02a08  誠品電影院
t02b07  真善美戲院
t02d20  光點台北電影院
```

Roles are preserved in `source_role`, for example:

```text
vieshow-waf-fallback
eslite-fallback
wonderful-fallback
spot-taipei-fallback
```

Method:

- request per cinema/per date
- parse movie title and runtime from page structure
- parse session times
- infer audio language only when version text explicitly says things such as `英文版`, `日文版`, `韓語版`, etc.
- subtitle remains `null` unless explicitly published; never infer English subtitles from English audio

Performance:

The original implementation performed 8 cinemas x 6 days = 48 HTTP requests serially and made the workflow unnecessarily slow.

Current implementation uses modest parallelism:

```text
CONCURRENCY = 6
```

Latest verified fallback count: 1,632 rows.

Some cinema/date combinations return no parseable rows, especially edge dates where schedules are not yet published. These are recorded as warnings and do not fail the whole source if other rows are valid.

This adapter is fallback only. Official sources should replace its records when reliable official automation becomes available.

## 9. Vie Show / 威秀 + MUVIE — MANUAL SNAPSHOT

Current state: 2,774 sessions across 20 official branch pages were reviewed and saved on 2026-10-27. The source URLs, per-branch counts, and observed fields are in `SOURCE-RESEARCH-NOTES.md` and `data/research/observed-sources.json`. Use `cinema/scripts/import-vieshow-browser-snapshot.mjs` after a future one-by-one browser review. Do not copy or run code from third-party repositories; the external source comparison is documented separately in `SOURCE-RESEARCH-LIST.md`.

The official branch pages state a rolling schedule window, usually Friday through the following Thursday after Wednesday release. The directory also exposes official cinema-list APIs, but the saved schedule here was transcribed from the branch pages, not inferred from an unverified endpoint.

The schedule is a manual snapshot. It is retained as last-known-good through scheduled API refreshes and must be reviewed manually to stay current. AtMovies remains a fallback only where an official source does not supply usable rows.

## 10. Wonderful Theatre / 真善美

Current status: AtMovies fallback (`t02b07`).

No stable official machine-readable automation has been integrated yet.

Before adding a new scraper, first check whether the official site exposes a JSON/XHR endpoint. Prefer that over DOM scraping.

## 11. SPOT Taipei / 光點台北

Current status: AtMovies fallback (`t02d20`).

Do not confuse this with SPOT Huashan. SPOT Huashan now has its own working official adapter; SPOT Taipei does not yet.

## 12. in89 Taipei Ximending — RESEARCH ONLY

Official site has been identified and Taipei Ximending uses:

```text
TheaterId=3
```

The film/showtime page is client-rendered. Normal server HTML does not contain the useful schedule rows.

Current blocker:

- underlying stable JSON/XHR/API endpoint has not yet been identified

Do not add a fake/empty adapter just to mark the source as implemented.

Next step for in89 is network/API discovery, then implement only after the actual data endpoint is known.

## Matching cinema showtimes to BAMID master records

The main updater matches dynamic source records back to the BAMID master.

Important normalizations already added:

- `台` / `臺`
- whitespace and punctuation
- generic terms such as `影城`, `電影城`, `戲院`, `劇院`, `電影館`
- address floor/unit details where useful
- street/number matching when names differ

Why this matters:

A source may call a cinema `MUVIE CINEMAS 台北松仁` while BAMID calls it `MUVIE CINEMAS威秀影城`. They are the same venue. Bad matching makes a real active cinema remain `unknown`.

Verified effect after matcher improvement:

```text
Taipei active master cinemas: 10 -> 12
Taipei unknown master cinemas: 20 -> 18
```

Do not use a more permissive fuzzy matcher that can accidentally merge different branches. Prefer deterministic aliases/address evidence.

## Cross-source dedup policy

Official sources run before fallback sources.

Exact normalized duplicates are deduplicated on cinema/movie/start-time/hall/format identity, so when official and fallback provide the same screening, the official row wins.

Do not deduplicate only by movie title + time across the whole city; different cinemas can legitimately have identical screening times.

## Subtitle policy

This is a product-critical rule.

`audio_language` and `subtitles` are different facts.

Examples:

```text
英文版 -> audio_language = "en"
```

does NOT prove:

```text
subtitles = ["en"]
```

Only populate English subtitles when the source explicitly declares English subtitle availability, e.g. SPOT Huashan `C/E` or Eslite `中/英` when its official source becomes fetchable again.

Unknown must remain `null`.

## Source-health policy

Every source must remain visible in `manifest.json`, including failed sources.

A workflow should not silently look healthy just because at least one adapter returned rows.

Current source access notes:

```text
ShowTimes public JSON: https://capi.showtimes.com.tw/4/app/bootstrap
ShowTimes HTML pages: previously returned HTTP 403 from GitHub Actions
eslite-official-schedule -> HTTP 403 from GitHub Actions
```

Current working important sources:

```text
miramar-official-api
ambassador-official-site
spot-huashan-official-schedule
atmovies-taipei-fallback
```

The ShowTimes JSON feed was verified from this workspace and contains nationwide corporation/event/program data. GitHub Actions currently receives HTTP 403 from the API, while the public feed allows cross-origin browser requests; the cinema page uses it live when the saved feed is degraded. The imported static snapshot is retained through failed refreshes using date/city chunks. Next recommended health improvement: add count-drop/freshness checks so a normally large source suddenly returning zero or a tiny fraction of its usual rows is flagged as degraded even if the parser technically returns successfully.

## Last verified workflow state

Historical baseline verified on 2026-10-24 from GitHub Actions run 24 before the ShowTimes JSON API integration:

```text
miramar-official-api:           355
ambassador-official-site:     2,683
spot-huashan-official-schedule: 79
atmovies-taipei-fallback:     1,632
showtimes-official-site:          0  (403)
eslite-official-schedule:         0  (403)
```

Taipei generated snapshot from that run:

```text
master cinemas: 30
active cinemas: 12
unknown cinemas: 18
showtimes: 2,663
```

Generated-data commit from that verified run:

```text
112e7e4  Update Taiwan cinema JSON [skip ci]
```

Relevant implementation commits immediately before it:

```text
9b26875  Fix Ambassador movie title parsing and language extraction
9430524  Parse SPOT Huashan schedule table cells
259841b  Add official Eslite Art House schedule source
d69db99  Integrate Eslite, improve cinema matching and cross-source dedup
e1ff1ff  Validate Eslite source status in workflow
b7d0bce  Parallelize Taipei fallback requests
4217716  Parallelize Ambassador schedule fetches
831a80d  Retry transient Ambassador schedule errors
```

## Where to continue next

For a new ChatGPT/Codex session, continue in this order instead of restarting source research:

1. Find a trustworthy address-to-coordinate source for the 54 BAMID cinema records still missing a linked map pin. Do not bulk-apply low-confidence city or postcode geocodes.
2. Add verified showtime collectors for Vie Show/MUVIE, in89, Eslite, Broadway, Global, and regional cinemas; retain current per-source failure state and date/city last-known-good fallback.
3. Improve poster, genre, rating, and international-title coverage using exact, unique source matches only. Do not infer movie metadata from similar titles.
4. Improve verified subtitle coverage from source-declared labels only; never infer subtitles from audio language.
5. Add source freshness/count-drop health checks so a normally large source suddenly returning zero or a small fraction of its usual rows is flagged as degraded.
6. Keep ticket prices sourced per brand and branch. Prices vary by venue, format, weekday, and promotions; do not copy a chain-wide generic amount into branch records.
7. Keep current source-quality and operational-status requirements before wiring data into guest-facing recommendations.

## Canonical project tracking

Canonical task:

```text
TASK-20261024-049
```

Ledger repository:

```text
philips-321/master-task-ledger
```

Project path:

```text
projects/taiwan-cinema-showtimes/
```

Do not create a new numeric parent task for every cinema adapter or patch. Use this parent or lettered subtasks when needed.
