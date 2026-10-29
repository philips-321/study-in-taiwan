import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('cinema/data');
const showRoot = path.join(root, 'showtimes/by-date');
const args = new Set(process.argv.slice(2));
const outputArg = process.argv.find(arg => arg.startsWith('--output='));

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const report = {
  schema: 'cinema-showtime-inventory',
  version: 1,
  generated_at: new Date().toISOString(),
  input_root: 'data/showtimes/by-date',
  files: [],
  totals: { files: 0, rows: 0, dates: 0, cities: 0, malformed_files: 0, missing_date_rows: 0 },
  dates: {},
  cities: {},
  sources: {},
  warnings: []
};

if (!fs.existsSync(showRoot)) throw new Error(`Missing ${showRoot}`);
const dates = fs.readdirSync(showRoot).filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort();
for (const date of dates) {
  const dateDir = path.join(showRoot, date);
  for (const file of fs.readdirSync(dateDir).filter(name => name.endsWith('.json')).sort()) {
    const relative = path.posix.join('data/showtimes/by-date', date, file);
    const full = path.join(dateDir, file);
    const bytes = fs.readFileSync(full);
    const entry = { path: relative, date, city: file.slice(0, -5), bytes: bytes.length, sha256: sha256(bytes), rows: 0, sources: {} };
    try {
      const chunk = JSON.parse(bytes);
      const rows = Array.isArray(chunk.showtimes) ? chunk.showtimes : [];
      entry.rows = rows.length;
      if (chunk.date !== date) report.warnings.push({ path: relative, type: 'chunk_date_mismatch', value: chunk.date });
      for (const row of rows) {
        if (!row.start_time || !row.movie_id || !row.cinema_id) report.totals.missing_date_rows++;
        const source = row.source || 'missing-source';
        entry.sources[source] = (entry.sources[source] || 0) + 1;
        report.sources[source] = (report.sources[source] || 0) + 1;
      }
    } catch (error) {
      entry.error = error.message;
      report.totals.malformed_files++;
    }
    report.files.push(entry);
    report.totals.rows += entry.rows;
    report.cities[entry.city] = (report.cities[entry.city] || 0) + entry.rows;
    report.dates[date] = (report.dates[date] || 0) + entry.rows;
  }
}
report.totals.files = report.files.length;
report.totals.dates = Object.keys(report.dates).length;
report.totals.cities = Object.keys(report.cities).length;
if (report.totals.malformed_files || report.totals.missing_date_rows) process.exitCode = 2;
const text = JSON.stringify(report, null, 2) + '\n';
if (outputArg) fs.writeFileSync(path.resolve(outputArg.slice('--output='.length)), text);
console.log(text);
