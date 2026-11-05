import { screeningIdentityKey } from './movie-schema.mjs';

// Additive means no screening is removed. Explicit, previously verified language
// facts are never overwritten by unknown/null values from a later scrape.
export function mergeAdditive(existing, incoming) {
  const output = existing.map(row => ({ ...row }));
  const index = new Map();
  for (let i = 0; i < output.length; i++) {
    const key = screeningIdentityKey(output[i]);
    if (!index.has(key)) index.set(key, i);
  }
  for (const row of incoming) {
    const key = screeningIdentityKey(row);
    const at = index.get(key);
    if (at === undefined) {
      index.set(key, output.length);
      output.push({ ...row });
      continue;
    }
    const old = output[at];
    // Only enrich missing fields. Conflicting verified facts must be reviewed,
    // never silently replaced, merged, or inferred from other fields.
    if (!old.audio_language && row.audio_language) old.audio_language = row.audio_language;
    if ((!Array.isArray(old.subtitles) || !old.subtitles.length) &&
        Array.isArray(row.subtitles) && row.subtitles.length) old.subtitles = [...row.subtitles];
  }
  return output;
}
