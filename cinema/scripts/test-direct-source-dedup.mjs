import assert from 'node:assert/strict';
import { dedupeRows } from './direct-source-dedup.mjs';
import { parseMuvieSongrenHtml } from './sources/vieshow-muvie-songren.mjs';
const row = { cinema_id: 'songren', movie_id: 'film', start_time: '2026-10-30T20:00:00+08:00' };
const fallback = { ...row, source: 'atmovies-taipei-fallback', format: '2D' };
const manual = { ...row, source: 'vieshow-official-browser', hall: 'unknown', format: 'Digital' };
const official = { ...row, source: 'vieshow-muvie-songren-official', format: '數位(英)' };
const premium = { ...official, format: 'MUCROWN(英)' };
const otherCinema = { ...fallback, cinema_id: 'other' };
const otherTime = { ...fallback, start_time: '2026-10-30T21:00:00+08:00' };
for (const rows of [[fallback, manual, official, premium, otherCinema, otherTime], [otherTime, premium, official, manual, fallback, otherCinema]]) {
  const output = dedupeRows(rows);
  assert.equal(output.length, 4);
  for (const kept of [official, premium, otherCinema, otherTime]) assert(output.includes(kept));
}
const html = '<a href="#movieTime1">10/30(五)</a><article id="movieTime1"><h1>測試片<span>普</span></h1><h2>TEST</h2><h4>數位(英)</h4><ul><li><a href="?txtSessionId=123">19:00</a></li><li><a>20:00</a></li></ul></article>';
const parsed = parseMuvieSongrenHtml(html);
assert.equal(parsed.length, 2);
assert.equal(parsed[0].source_event_id, '123');
assert.equal(parsed[1].source_event_id, null);
assert.equal(parsed[1].subtitles, null);
console.log('Direct source regressions passed: official precedence, distinct formats/cinemas/times, visible MUVIE sessions without booking IDs.');
