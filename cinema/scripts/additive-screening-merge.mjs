import { screeningIdentityKey } from './movie-schema.mjs';

// Preserve every existing row, including historical duplicates.
// Add incoming rows only when their screening identity is new.
// Never overwrite existing provenance.
export function mergeAdditive(existing, incoming) {
  const output = [...existing];
  const seen = new Set(existing.map(screeningIdentityKey));

  for (const row of incoming) {
    const key = screeningIdentityKey(row);
    if (seen.has(key)) continue;
    output.push(row);
    seen.add(key);
  }

  return output;
}
