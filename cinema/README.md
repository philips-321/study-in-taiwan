# Taiwan Cinema / Showtime Collector

Read this file first before changing the cinema pipeline.

## Browser experience

`cinema/index.html` is the public cinema browser. It loads the fixed per-city JSON files below `data/` and individual OSM venue points from `data/locations.json`. Pins sit at their source coordinates, never at a city center; matched pins open the cinema record and the selected day's screenings. BAMID names, company, address, phone, and screen count are shown when available. A location can include an optional `image_url` for a sourced building photo.

The location button puts the map at the browser's exact reported coordinates (zoom 15.6) and selects the nearest city for the list. The date navigator includes only dates from Taiwan's current date onward; the previous-date control is locked. Movie, audio, and explicitly verified subtitle filters remain available, as do English, Traditional Chinese, Indonesian, Japanese, Korean, Vietnamese, and Thai UI languages and dark/light themes. Keep `subtitles: null` distinct from an explicit subtitle language: null means the source did not provide verified subtitle information.

The annual BAMID master has no coordinates. The current OSM snapshot has 88 individual map points, 39 linked to 107 BAMID records by venue name or address. The rest are OSM cinema points without a linked schedule record; BAMID venues still lacking a verified point remain in the address list without a pin. The points are a useful visible baseline, not full coverage. OSM attribution is shown on the map. Building photos are only shown when a sourced image URL exists; no photos are present in the current BAMID data.

The current cinema dataset has `movie_title` and sometimes `movie_title_en`; it does not contain per-country title translations. The UI labels `movie_title_en` as the international title when supplied and does not derive localized titles from the interface language. Explicit subtitle coverage is sparse, so subtitle search must leave unknown values unclassified rather than inferring them from audio language.

This project is an ongoing maintained data pipeline, not a project with a meaningful completion percentage. Upstream cinema sites will change and adapters will need patching over time.

## Goal

Maintain current Taiwan cinema/showtime data as fixed per-city JSON files for `study-in-taiwan.com`, without Cloudflare D1 while static JSON is sufficient.

Published files are overwritten in place:

```text
cinema/data/cinemas/<city>.json
cinema/data/showtimes/<city>.json
cinema/data/manifest.json
```

Do not create `showtimes-YYYY-MM-DD.json` archives. Git history is the audit/history layer.

Main updater:

```text
cinema/scripts/update-cinema-data.mjs
```

Scheduled workflow:

```text
.github/workflows/update-cinema-data.yml
```

Schedule: approximately 05:27 and 17:27 Asia/Taipei, plus manual `workflow_dispatch`.

## Source status summary

| Source | Method | Current status | Notes |
|---|---|---|---|
| BAMID national cinema master | Official metadata endpoint -> newest annual CSV | WORKING | Stable cinema identity/master data, not showtimes |
| Ministry of Culture movie API | Official JSON API | WORKING but sparse | Supplemental cultural/event screenings only |
| Miramar / 美麗華大直 | Official booking API | WORKING | Best source quality; direct structured JSON |
| Ambassador / 國賓 | Official TheaterList + per-theater/per-date HTML | WORKING | Parallel fetch + retry; title parser fixed |
| SPOT Huashan / 光點華山 | Official schedule HTML table | WORKING | 79 rows in verified run; preserves C/E subtitle metadata |
| ShowTimes / 秀泰 | Official cinema HTML pages | BLOCKED from GitHub Actions | HTTP 403 on both tested Taipei cinemas |
| Eslite Art House / 誠品電影院 | Official schedule HTML | BLOCKED from GitHub Actions | Parser exists, but runner gets HTTP 403 |
| AtMovies Taipei fallback | Aggregator HTML by cinema/date | WORKING fallback | Used only for gaps where official automation is blocked/incomplete |
| Vie Show / 威秀 + MUVIE | Official automation not yet integrated | FALLBACK ACTIVE | AtMovies fallback currently covers selected Taipei branches |
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

Latest runs have ranged from 0 to only a few current showtimes. Low count here is not necessarily a parser failure.

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

## 6. ShowTimes / 秀泰 — OFFICIAL PARSER EXISTS, GITHUB RUNNER BLOCKED

Adapter:

```text
cinema/scripts/sources/showtimes.mjs
```

Currently configured Taipei cinemas:

```text
台北欣欣秀泰影城 -> cinema id 2
大巨蛋秀泰影城   -> cinema id 91
```

Official URL pattern:

```text
https://www.showtimes.com.tw/cinemas/<id>/
```

Parser can extract:

- movie title
- date
- session time
- format
- explicit spoken language label when present

Problem:

GitHub Actions consistently receives:

```text
403 Forbidden
```

for both tested Taipei official pages.

This is an access/WAF problem, not currently a parsing problem.

Do not spend time repeatedly rewriting the parser unless the HTTP response changes from 403 to a normal page. First test whether the runner can fetch the page at all.

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

## 9. Vie Show / 威秀 + MUVIE

Current state: selected Taipei branches are served through the AtMovies fallback above.

A useful reference implementation was found in the public `RabbitKM/cinema-showtime-pipeline` project. Its Vie Show scraper uses Playwright, opens the official site, then calls official endpoints inside the browser session such as:

```text
/api/GetLstDicCinema
ShowTimes/GetShowTimes
```

The reason it uses a browser session is the official site/Akamai protection.

This approach has NOT yet been integrated into this repo because the current GitHub Actions pipeline is intentionally lightweight Node/static JSON and we have not yet decided to add Playwright/Chrome just for Vie Show.

Do not assume the direct endpoint will work server-side without the browser cookies/session.

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

Current known blocked sources:

```text
showtimes-official-site -> HTTP 403 from GitHub Actions
eslite-official-schedule -> HTTP 403 from GitHub Actions
```

Current working important sources:

```text
miramar-official-api
ambassador-official-site
spot-huashan-official-schedule
atmovies-taipei-fallback
```

Next recommended health improvement: add count-drop/freshness checks so a normally large source suddenly returning zero or a tiny fraction of its usual rows is flagged as degraded even if the parser technically returns successfully.

## Last verified workflow state

Verified on 2026-10-24 from GitHub Actions run 24 after Ambassador retry patch:

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

1. Validate SPOT Huashan output content, especially that `C/E` becomes `subtitles: ["zh", "en"]` in generated JSON.
2. Add source freshness/count-drop health checks.
3. Investigate in89 Ximending `TheaterId=3` network calls and identify the actual data endpoint.
4. Investigate whether Vie Show official endpoints can be used safely without Playwright; if not, decide whether adding a browser-based collector is worth the dependency/cost.
5. Keep Eslite and ShowTimes official adapters as explicit 403 failures; do not waste time reparsing until HTTP access itself changes.
6. Continue improving deterministic BAMID identity aliases where real active cinemas remain unmatched.
7. Expand Taiwan-wide sources after Taipei source quality is solid enough for recommendation use.
8. Wire verified data into the guest-facing recommendation UI only using `recommendation_eligible=true` or separate current verification.

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
