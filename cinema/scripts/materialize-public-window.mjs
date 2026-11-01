import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = new Map(process.argv.slice(2).filter(x => x.includes('=')).map(x => { const [k, ...v] = x.slice(2).split('='); return [k, v.join('=')]; }));
const canonicalRoot = path.resolve(args.get('canonical-root') || '/tmp/cinema-canonical-a/canonical');
const outputRoot = path.resolve(args.get('output-root') || '/tmp/cinema-public-window');
const asOf = args.get('as-of') || new Date().toISOString().slice(0, 10);
const days = Number(args.get('days') || 30);
const start = new Date(`${asOf}T00:00:00Z`), end = new Date(start); end.setUTCDate(end.getUTCDate() + days);
const rows = [];
for (const file of fs.readdirSync(canonicalRoot).filter(x => x.endsWith('.jsonl')).sort()) {
  for (const line of fs.readFileSync(path.join(canonicalRoot, file), 'utf8').split('\n').filter(Boolean)) rows.push(JSON.parse(line));
}
const selected = rows.filter(row => row.status === 'canonical' && row.business_date >= asOf && row.business_date <= end.toISOString().slice(0, 10));
const groups = new Map();
for (const row of selected) {
  const city = row.city || row.region || 'unknown'; const key = `${row.business_date}/${city}`;
  if (!groups.has(key)) groups.set(key, []);
  // Keep the legacy renderer contract at the materialized-view boundary.
  groups.get(key).push({
    id: row.screening_id, cinema_id: row.cinema_id, movie_id: row.movie_id,
    start_time: row.start_time, hall: row.hall, format: row.format, audio_language: row.audio,
    subtitles: row.subtitles, source_event_id: row.source_row_key, source_url: row.source_url,
    source: row.source_id, source_role: row.source_role || row.source_id, freshness: 'fresh',
    retrieved_at: row.observed_at
  });
}
fs.rmSync(outputRoot, { recursive: true, force: true });
for (const [key, group] of groups) {
  const [date, city] = key.split('/'); const dir = path.join(outputRoot, 'by-date', date); fs.mkdirSync(dir, { recursive: true });
  const payload = { schema: 'canonical-screening-public-view', version: 1, date, city, showtimes: group };
  fs.writeFileSync(path.join(dir, `${city}.json`), JSON.stringify(payload, null, 2) + '\n');
}
const digest = crypto.createHash('sha256');
const files = [];
const showtimesIndex = {};
for (const [key, group] of groups) {
  const [date, city] = key.split('/');
  showtimesIndex[date] ||= { total: 0, cities: {} };
  showtimesIndex[date].total += group.length;
  showtimesIndex[date].cities[city] = group.length;
}
for (const date of fs.existsSync(path.join(outputRoot, 'by-date')) ? fs.readdirSync(path.join(outputRoot, 'by-date')).sort() : []) for (const file of fs.readdirSync(path.join(outputRoot, 'by-date', date)).sort()) { const relative = `by-date/${date}/${file}`; const bytes = fs.readFileSync(path.join(outputRoot, relative)); digest.update(relative); digest.update(bytes); files.push(relative); }
const report = { schema: 'public-window-report', as_of: asOf, days, end_date: end.toISOString().slice(0, 10), generated_at: new Date().toISOString(), input_rows: rows.length, public_rows: selected.length, excluded_by_window: rows.length - selected.length, files: files.length, sha256: digest.digest('hex'), showtimes_index: showtimesIndex, coverage: { showtime_rows: selected.length, explicit_subtitle_rows: selected.filter(row => Array.isArray(row.subtitles) && row.subtitles.length).length } };
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
