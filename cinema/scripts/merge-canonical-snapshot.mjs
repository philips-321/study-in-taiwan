import fs from 'node:fs';
import path from 'node:path';

const dataRoot = path.resolve('cinema/data');
const canonicalRoot = path.join(dataRoot, 'canonical');
const incomingRoot = path.resolve(process.argv[2] || '/tmp/cinema-new-canonical');
const previousMoviesArg = process.argv.find(arg => arg.startsWith('--previous-movies='));
const previousMoviesFile = previousMoviesArg ? path.resolve(previousMoviesArg.slice('--previous-movies='.length)) : null;
const readRows = file => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
const rowsByMonth = new Map();

for (const file of fs.readdirSync(canonicalRoot).filter(name => /^\d{4}-\d{2}\.jsonl$/.test(name)).sort()) {
  rowsByMonth.set(file.slice(0, 7), readRows(path.join(canonicalRoot, file)));
}

let added = 0;
for (const file of fs.readdirSync(incomingRoot).filter(name => /^\d{4}-\d{2}\.jsonl$/.test(name)).sort()) {
  const month = file.slice(0, 7);
  const rows = rowsByMonth.get(month) || [];
  const known = new Set(rows.map(row => row.screening_id));
  for (const row of readRows(path.join(incomingRoot, file))) {
    if (row.status !== 'canonical' || known.has(row.screening_id)) continue;
    rows.push(row);
    known.add(row.screening_id);
    added++;
  }
  rowsByMonth.set(month, rows);
}

fs.mkdirSync(canonicalRoot, { recursive: true });
for (const [month, rows] of rowsByMonth) {
  fs.writeFileSync(path.join(canonicalRoot, `${month}.jsonl`), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
}

const partitions = Object.fromEntries([...rowsByMonth].sort(([a], [b]) => a.localeCompare(b)).map(([month, rows]) => [month, rows.length]));
const total = Object.values(partitions).reduce((sum, count) => sum + count, 0);
const manifestFile = path.join(canonicalRoot, 'manifest.json');
const priorManifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
fs.writeFileSync(manifestFile, `${JSON.stringify({
  ...priorManifest,
  schema: 'canonical-screening-manifest',
  version: 1,
  source: 'daily collector snapshots merged by screening_id',
  screening_rows: total,
  unresolved_rows: priorManifest.unresolved_rows || 0,
  partitions,
  migration_status: 'active',
  updated_at: new Date().toISOString()
}, null, 2)}\n`);

// The legacy collector rebuilds the movie catalog from fresh rows. Keep metadata
// for films still referenced by the durable canonical archive as well.
if (previousMoviesFile && fs.existsSync(previousMoviesFile)) {
  const moviesFile = path.join(dataRoot, 'movies', 'index.json');
  const currentCatalog = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));
  const previousCatalog = JSON.parse(fs.readFileSync(previousMoviesFile, 'utf8'));
  const referencedIds = new Set([...rowsByMonth.values()].flat().map(row => row.movie_id).filter(Boolean));
  const currentIds = new Set((currentCatalog.movies || []).map(movie => movie.movie_id));
  const retained = (previousCatalog.movies || []).filter(movie => referencedIds.has(movie.movie_id) && !currentIds.has(movie.movie_id));
  currentCatalog.movies.push(...retained);
  currentCatalog.movies.sort((a, b) => String(a.movie_id).localeCompare(String(b.movie_id)));
  currentCatalog.generated_at = new Date().toISOString();
  fs.writeFileSync(moviesFile, `${JSON.stringify(currentCatalog, null, 2)}\n`);
}
console.log(JSON.stringify({ added_rows: added, screening_rows: total, partitions }, null, 2));
