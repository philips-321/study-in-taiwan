import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { screeningKey } from './movie-schema.mjs';
const root = path.resolve('cinema/data');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const manifest = read('manifest.json');
const movies = read('movies/index.json').movies;
const movieIds = new Set(movies.map(movie => movie.movie_id));
assert.equal(movieIds.size, movies.length, 'Duplicate movie IDs');
const references = new Set(), sessions = new Set(), cityCounts = {}, sourceCounts = {};
let total = 0, supplementalVenues = new Set();
for (const date of fs.readdirSync(path.join(root, 'showtimes/by-date')).sort()) {
  let dateTotal = 0;
  for (const file of fs.readdirSync(path.join(root, 'showtimes/by-date', date)).filter(file => file.endsWith('.json'))) {
    const city = file.slice(0, -5), chunk = read(`showtimes/by-date/${date}/${file}`);
    const cinemaIds = new Set(read(`cinemas/${city}.json`).cinemas.map(cinema => cinema.id));
    assert.equal(chunk.version, 2); assert.equal(chunk.schema, 'normalized-movie-references');
    assert.equal(chunk.date, date); assert.equal(chunk.city, city);
    const directBases = new Set(chunk.showtimes.filter(row => ['eslite-official-schedule', 'vieshow-muvie-songren-official'].includes(row.source)).map(row => [row.cinema_id, row.movie_id, row.start_time].join('|')));
    for (const row of chunk.showtimes) {
      assert(movieIds.has(row.movie_id), `Unknown movie ${row.movie_id}`);
      assert(row.cinema_id && row.start_time && row.source && row.source_url, 'Missing provenance or identity');
      if (!cinemaIds.has(row.cinema_id)) {
        // MOC cultural venues are supplemental to the BAMID commercial cinema master.
        assert(row.source === 'moc-culture-movie-api' && row.cinema_name, `Unknown cinema ${row.cinema_id}`);
        supplementalVenues.add(row.cinema_id);
      }
      assert.equal(row.start_time.slice(0, 10), date);
      for (const field of ['movie_title','movie_title_en','poster_url','genres','rating','duration_minutes']) assert(!Object.hasOwn(row, field), `Repeated movie field ${field}`);
      const key = screeningKey(row); assert(!sessions.has(key), `Duplicate screening ${key}`); sessions.add(key);
      if (!['eslite-official-schedule', 'vieshow-muvie-songren-official'].includes(row.source)) assert(!directBases.has([row.cinema_id,row.movie_id,row.start_time].join('|')), 'Losing fallback/manual duplicate');
      references.add(row.movie_id); total++;
      sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1;
    }
    if (chunk.showtimes.length) assert.equal(manifest.showtimes_index[date]?.cities[city], chunk.showtimes.length);
    dateTotal += chunk.showtimes.length;
    cityCounts[city] = (cityCounts[city] || 0) + chunk.showtimes.length;
  }
  assert.equal(manifest.showtimes_index[date]?.total || 0, dateTotal);
}
assert.equal(references.size, movieIds.size, 'Unreferenced catalog films');
assert.equal(total, manifest.coverage.showtime_rows);
assert.equal(references.size, manifest.coverage.unique_title_pairs.title_pairs);
for (const [city, counts] of Object.entries(manifest.cities)) {
  const actual = cityCounts[city] || 0, status = read(`showtimes/${city}.json`);
  assert.equal(counts.showtimes, actual, `${city} manifest count`);
  assert.equal(status.showtime_count, actual, `${city} status count`);
  assert.equal(status.showtimes.length, 0, `${city} repeated screening rows`);
}
for (const [date, entry] of Object.entries(manifest.showtimes_index)) for (const [city, count] of Object.entries(entry.cities)) assert.equal(read(`showtimes/by-date/${date}/${city}.json`).showtimes.length, count);
for (const slug of ['muvie', 'eslite']) {
  const source = slug === 'muvie' ? 'vieshow-muvie-songren-official' : 'eslite-official-schedule';
  let count = 0;
  for (const file of fs.readdirSync(path.join(root, 'showtimes/direct-official/source', slug))) count += read(`showtimes/direct-official/source/${slug}/${file}`).rows.length;
  assert.equal(sourceCounts[source], count, `${slug} snapshot/canonical count`);
  const health = read('showtimes/taipei.json').sources[source];
  assert(health.ok && health.health === 'healthy' && !health.error);
  assert.equal(health.showtimes, count);
}
console.log(JSON.stringify({ valid: true, screening_rows: total, referenced_films: references.size, supplemental_moc_venues: supplementalVenues.size, taipei_rows: cityCounts.taipei, direct_sources: { muvie: sourceCounts['vieshow-muvie-songren-official'], eslite: sourceCounts['eslite-official-schedule'] } }, null, 2));
