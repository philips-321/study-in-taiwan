import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('cinema/data');
const registryFile = path.join(root, 'canonical/movie-registry.jsonl');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'canonical/manifest.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'movies/index.json'), 'utf8')).movies || [];
const records = fs.readFileSync(registryFile, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const canonicalIds = new Set();
const movieIds = new Set();
let posterYes = 0, posterNo = 0;

for (const movie of records) {
  assert(movie.canonical_movie_id && !canonicalIds.has(movie.canonical_movie_id), `Missing or duplicate canonical_movie_id: ${movie.canonical_movie_id}`);
  canonicalIds.add(movie.canonical_movie_id);
  assert(['yes', 'no'].includes(movie.poster_status), `Invalid poster_status: ${movie.canonical_movie_id}`);
  assert.equal(movie.has_poster, movie.poster_status === 'yes', `poster_status/has_poster mismatch: ${movie.canonical_movie_id}`);
  assert.equal(Boolean(movie.poster_url), movie.poster_status === 'yes', `poster_status/poster_url mismatch: ${movie.canonical_movie_id}`);
  assert(Array.isArray(movie.movie_ids) && movie.movie_ids.length, `No catalog movie IDs: ${movie.canonical_movie_id}`);
  for (const id of movie.movie_ids) {
    assert(!movieIds.has(id), `movie_id belongs to multiple canonical records: ${id}`);
    movieIds.add(id);
  }
  if (movie.poster_url) {
    const url = new URL(movie.poster_url);
    assert.equal(url.protocol, 'https:', `Poster URL must use HTTPS: ${movie.canonical_movie_id}`);
    posterYes++;
  } else posterNo++;
}

for (const movie of catalog) assert(movieIds.has(movie.movie_id), `Movie missing from canonical registry: ${movie.movie_id}`);
assert.equal(records.length, manifest.movie_registry?.unique_films, 'Canonical movie count mismatch');
assert.equal(posterYes, manifest.movie_registry?.poster_yes, 'Canonical poster_yes count mismatch');
assert.equal(posterNo, manifest.movie_registry?.poster_no, 'Canonical poster_no count mismatch');
console.log(JSON.stringify({ valid: true, unique_films: records.length, poster_yes: posterYes, poster_no: posterNo }, null, 2));
