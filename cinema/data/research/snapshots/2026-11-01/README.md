# Reviewed Taipei cinema snapshots — 2026-11-01

These TSV files preserve source-reviewed schedule evidence used by the non-destructive Taipei cinema importer.

Rules:

- Existing normalized cinema/movie/showtime data is the baseline.
- Snapshot imports are additive/merge-oriented; absence from a newer snapshot is not permission to delete older data.
- `official` sources take precedence over fallback sources when the same screening identity is proven.
- Fallback files remain explicitly labelled in filenames and source metadata.
- Missing audio/subtitle metadata must remain unknown unless the source explicitly supplies it.
- The current guest-facing display horizon is 2026-12-07; data after that date may remain stored for later reconciliation.
