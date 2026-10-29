# SPOT Taipei official adapter — 2026-10-29

This note supersedes the earlier 2026-10-29 statement that deterministic SPOT Taipei detail-page discovery was still unresolved.

## Verified official discovery path

Current listing:

`https://www.spot.org.tw/movies/201404/movies201404.html`

A live Browser Rendering read returned deterministic official detail links such as:

- `https://www.spot.org.tw/movies/202610/m1/movies202610_m1.html`
- `https://www.spot.org.tw/movies/202610/m2/movies202610_m2.html`
- `https://www.spot.org.tw/movies/202610/m3/movies202610_m3.html`
- `https://www.spot.org.tw/movies/202610/m4/movies202610_m4.html`
- `https://www.spot.org.tw/movies/202610/m5/movies202610_m5.html`
- `https://www.spot.org.tw/movies/202610/m6/movies202610_m6.html`

The listing also contains older/generic links. The adapter therefore discovers same-host detail URLs by path shape, deduplicates them, and accepts only detail pages that produce actual parseable schedule rows.

## Verified detail structure

Example detail:

`https://www.spot.org.tw/movies/202610/m4/movies202610_m4.html`

Observed official fields:

- Chinese title: `蕭邦！蕭邦！`
- international title: `CHOPIN, CHOPIN!`
- runtime: `114min`
- subtitle class: `C/E Subtitles`
- rating: `輔12`
- dated schedule table using rowspan dates, including 2026-10-29 17:00 and 21:10.

The source explicitly supplies subtitle class, so `C/E Subtitles` is normalized to `['zh','en']`; subtitle language is not inferred from audio.

## Implementation

- `cinema/scripts/sources/spot-taipei.mjs`
- source ID: `spot-taipei-official-schedule`
- BAMID cinema ID: `31d9eecd32050b08`
- integrated into `cinema/scripts/refresh-direct-official-sources.mjs`
- direct official priority is above AtMovies fallback.
- bounded detail-page batches of 3 avoid hammering the legacy official site.
- a failed individual detail page is isolated; the source only fails as a whole if no current schedule row can be parsed.

Offline regression:

- `cinema/scripts/test-spot-taipei-parser.mjs`
- verifies detail-link deduplication and rowspan schedule propagation.
- equivalent logic was independently exercised on 2026-10-29 and produced three expected rows for the fixture.

## Static-data state

The adapter and refresh integration are committed. The saved `by-date` static chunks have not yet been regenerated from this new source in this research pass. Do not claim SPOT Taipei official rows are live in the public static dataset until a direct refresh writes and validates the resulting chunks/catalog/manifest.

## Wonderful Theatre

Wonderful Theatre remains the next unresolved fallback candidate. Its official current-film site is live, but its complete schedule request is still dynamic. Browser Rendering exposed the page's JavaScript assets, but further asset inspection hit the Browser Rendering rate limit. Do not retry aggressively; resume with bounded inspection later and keep fallback coverage meanwhile.
