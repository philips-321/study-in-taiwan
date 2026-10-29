# Cinema data architecture

Status: design contract. The current `data/showtimes/by-date/` tree is legacy materialized data; it must not be treated as the finished canonical database until the migration gates below pass.

## Source of truth

The source of truth is a canonical screening record, not a JSON filename:

```text
screening_id       stable identity for the screening event
cinema_id          stable venue identity
movie_id           stable catalog identity
business_date     YYYY-MM-DD date published by the cinema
start_time        local start time
hall/format/audio  only when explicitly observed
source_id          source registry identity
source_row_key     stable key from that source, when available
source_url         evidence URL
observed_at        capture timestamp
parser_version     parser that produced the record
status             canonical | unresolved | superseded
```

Every canonical record must retain provenance. A missing row in a later refresh means “not observed this time”; it is not proof that the source cancelled the screening.

## Physical partitions and public files

Canonical records are partitioned by business-date range, normally one month. A region or cinema subpartition is added only when a monthly partition is too large. The date remains a field in every record. Empty city/date files are never created.

The website receives a materialized rolling view under `data/showtimes/by-date/`. It contains only today through the next 30 calendar days and only non-empty city partitions. This view is disposable and reproducible; it is not the canonical store. Dates before today and dates beyond the 30-day public window are excluded from this view by an explicit retention/materialization step, never by parser heuristics.

## Evidence and unresolved data

Raw captures, staging rows, unresolved rows, and reconciliation reports are separate from the public view. An unusual year, legacy filename, old title, weekday mismatch, missing booking ID, or midnight ambiguity goes to staging/unresolved with evidence. It is not silently deleted.

## Reconciliation contract

Each materialization writes a report containing:

```text
input_rows, canonical_rows, public_rows,
added, updated, unchanged, superseded,
unresolved, excluded_by_window, removed_by_retention,
date_min, date_max, source_counts, sha256
```

The build fails if canonical row counts fall without an explicit reason, a source capture is missing, a stable reference is broken, or a duplicate rule removes a row with a different cinema/movie/date/time/hall identity. The retention report must list every removed public date range and checksum the resulting view.

## Migration gates

1. Inventory all existing date chunks and verify their row/reference counts.
2. Convert them into canonical records without changing facts or discarding anomalous rows.
3. Run duplicate and provenance validation against the existing manifest.
4. Materialize the 30-day public view and compare it with the current site output.
5. Re-run the materializer twice and require identical output and checksums.
6. Test late future dates, after-midnight sessions, stale source pages, official-over-fallback precedence, venue closure, and a row that falls outside the public window.
7. Only after all gates pass may the old date tree be replaced or old public partitions be removed.

This contract applies to Cinema first. Other repository databases may adopt the same Oracle-style separation—canonical facts, provenance, partitions, materialized views, and explicit retention—but each dataset requires its own migration and retention review.
