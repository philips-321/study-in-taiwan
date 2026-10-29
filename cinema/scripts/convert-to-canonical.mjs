import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dataRoot = path.resolve('cinema/data');
const inputRoot = path.join(dataRoot, 'showtimes/by-date');
const outputArg = process.argv.find(arg => arg.startsWith('--output-root='));
const outputRoot = outputArg ? path.resolve(outputArg.slice('--output-root='.length)) : null;
const parserVersion = 'canonical-converter-v1';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value, Object.keys(value).sort());
const canonical = [], unresolved = [], inputFiles = [];

for (const date of fs.readdirSync(inputRoot).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort()) {
  const dir = path.join(inputRoot, date);
  for (const file of fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
    const filePath = path.join(dir, file), chunk = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const city = file.slice(0, -5);
    inputFiles.push(path.posix.join('data/showtimes/by-date', date, file));
    for (let index = 0; index < (chunk.showtimes || []).length; index++) {
      const row = chunk.showtimes[index];
      const businessDate = row.start_time?.slice(0, 10) || chunk.date || date;
      const sourceId = row.source || 'unknown-source';
      const sourceRowKey = row.booking_id || row.session_id || row.id || hash(stable({ city, date: businessDate, index, row }));
      const identity = { cinema_id: row.cinema_id || null, movie_id: row.movie_id || null, business_date: businessDate, start_time: row.start_time || null, source_id: sourceId, source_row_key: String(sourceRowKey) };
      const record = {
        screening_id: `scr_${hash(stable(identity)).slice(0, 24)}`,
        cinema_id: identity.cinema_id,
        city,
        movie_id: identity.movie_id,
        business_date: identity.business_date,
        start_time: identity.start_time,
        hall: row.hall ?? null,
        format: row.format ?? null,
        audio: row.audio ?? null,
        source_id: sourceId,
        source_row_key: identity.source_row_key,
        source_url: row.source_url || null,
        observed_at: row.observed_at || chunk.observed_at || chunk.retrieved_at || null,
        parser_version: parserVersion,
        status: 'canonical',
        legacy_input: path.posix.join('data/showtimes/by-date', date, file)
      };
      const invalid = ['cinema_id', 'movie_id', 'business_date', 'start_time', 'source_url'].filter(key => !record[key]);
      if (invalid.length) { record.status = 'unresolved'; record.unresolved_reasons = invalid; unresolved.push(record); }
      else canonical.push(record);
    }
  }
}

if (outputRoot) {
  fs.mkdirSync(path.join(outputRoot, 'canonical'), { recursive: true });
  fs.mkdirSync(path.join(outputRoot, 'unresolved'), { recursive: true });
  const byMonth = new Map();
  for (const row of canonical) { const month = row.business_date.slice(0, 7); if (!byMonth.has(month)) byMonth.set(month, []); byMonth.get(month).push(row); }
  for (const [month, rows] of byMonth) fs.writeFileSync(path.join(outputRoot, 'canonical', `${month}.jsonl`), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
  fs.writeFileSync(path.join(outputRoot, 'unresolved', 'records.jsonl'), unresolved.map(row => JSON.stringify(row)).join('\n') + (unresolved.length ? '\n' : ''));
}
const report = { schema: 'canonical-conversion-report', parser_version: parserVersion, input_files: inputFiles.length, input_rows: canonical.length + unresolved.length, canonical_rows: canonical.length, unresolved_rows: unresolved.length, months: [...new Set(canonical.map(row => row.business_date.slice(0, 7)))].sort(), output_root: outputRoot ? path.relative(process.cwd(), outputRoot) : null };
console.log(JSON.stringify(report, null, 2));
if (unresolved.length) process.exitCode = 2;
