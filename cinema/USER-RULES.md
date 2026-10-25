# User rules for Taiwan Cinema

Read this before researching sources, editing cinema data, changing the cinema UI, or touching its update process. These are the user's standing requirements; they take priority over older workflow notes elsewhere in this README.

## Source research and updates

- Research each cinema by opening its actual source in a browser, one cinema at a time. Inspect the page and record what it actually shows.
- Prefer the cinema's own official site or booking page. If only an aggregator is available, label it as an aggregator; never describe it as official.
- Save the source URL, review date, fields observed, and any access or rendering limitation in `SOURCE-RESEARCH-NOTES.md`, `SOURCE-RESEARCH-LIST.csv`, and `data/research/observed-sources.json`.
- Do not use or trigger GitHub Actions to browse, collect, or refresh cinema data. Do not create scheduled workers or assume automated updates. Updates are manual and use the browser-verified sources.
- After a successful source check for a Taiwan date, reuse the saved JSON for that date. Never refetch a source because another visitor opened the page.
- Do not invent a schedule to fill an empty record. A selector, placeholder, search snippet, or unrendered JavaScript shell is not a verified screening list. Mark missing data as missing and continue source research.
- Never make the visitor's browser call a cinema schedule API once per visitor. All visitors should reuse the same published static JSON, with normal caching. Keep files small and load only the date/city data needed by the page.
- Keep CPU and memory use down: avoid duplicated catalogs/session rows and oversized image payloads; lazy-load posters and other nonessential media.
- Do not claim all Taiwan cinemas or all schedules are covered unless the source and current data demonstrate it.

## JSON and data quality

- Keep cinemas, movies, schedules, ticket prices, and research observations in small, separated JSON files. Screening rows live only in `data/showtimes/by-date/<date>/<city>.json`.
- Reuse one `cinema_id` per venue and one `movie_id` per verified film. A screening references those IDs; do not copy poster, genre, rating, or other movie metadata into every session row.
- Before adding a movie, compare its Chinese and international titles with the existing catalog. Reuse the existing movie record for the same film instead of creating a duplicate. Fill a missing international title from a matching, verified record when the identity is clear.
- Never truncate a movie title because it is long. If a source value ends mid-word or appears length-limited, check an authoritative source and store the full title. Do not use display ellipses as stored movie data.
- Movie titles are source titles. Changing the interface language must not translate or rewrite film titles. Store a verified international title in the movie catalog and make it searchable.
- Provide an English name for every cinema where one is published by the cinema or its company. If no official English name is available, label the chosen transliteration/name as unverified rather than calling it official.
- Reuse film posters and metadata in the single movie catalog record. Keep poster URLs deduplicated; do not download poster bytes into JSON.
- Store genres, runtime, and age rating only when a source supports them. Unknown values stay absent or `null`; never make up a genre or rating.
- Keep audio and subtitles as separate facts. Record subtitle languages only when the source explicitly lists them. Do not infer subtitles from audio language; unknown stays `null`.
- Ticket prices belong to a specific branch and format and must include their source and capture date. Do not copy one branch's price to a whole cinema brand or present a dated price as a live checkout quote.
- Keep the source and freshness provenance on manually transcribed screenings. Preserve different times, halls, formats, and cinemas as separate screenings; deduplicate only exact duplicate sessions.
- The date picker must not offer dates before Taiwan's current date. Show only dates for which saved schedule data exists; do not invent a generic calendar range.

## Map and interface preferences

- Show individual cinema locations using verified coordinates. Never place every venue at a city-center dot. Use actual cinema/company logos when available; do not replace available logos with initials.
- “Use my location” should show the user's blue position marker and zoom closely to the actual position, like Garbage Truck v2. Distances in cinema listings should be relative to that position.
- Keep the mobile map/list usable: provide a clear `↑ open list` control, a way to collapse the list for a full map, and a way back to the split map/list view. Keep controls together in the top toolbar and out of the bottom scroll area.
- Keep the mobile controls compact. Do not spend vertical space on the “Find a film. Pick your version.” hero copy. Use readable type and spacing; Chinese cinema names must not run together.
- Let people browse by city and cinema brand, and search using Chinese or international movie titles. Preserve explicit audio and subtitle filters.
- Clicking a film title should open its detail card with the available poster, genre, and age rating. Keep missing facts visibly unknown instead of dropping the feature or inventing a value. Offer dark and light themes.
- Film titles and addresses need copy buttons. Display the source address, including floors, but omit floor-only suffixes from the copied map-search address while retaining meaningful street-number, lane, alley, and `之` address components.
- Building photos and cinema logos must come from attributable, relevant sources. Do not substitute a generic or misleading image.
- Keep cinema cards usable when a venue has no indexed schedule; label that state clearly instead of implying the cinema has no showings.

## Handoff

For a new cinema chat, read this file, then `README.md`, then inspect the branch, `data/manifest.json`, `SOURCE-RESEARCH-NOTES.md`, and `data/research/observed-sources.json`. Continue from the current source tracker; do not restart research or use an update workflow in place of browser review.
