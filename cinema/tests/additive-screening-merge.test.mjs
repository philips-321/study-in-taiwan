import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAdditive } from '../scripts/additive-screening-merge.mjs';
import { mapAudio } from '../scripts/sources/vieshow-muvie-songren.mjs';

const base = {
  cinema_id: '1234567890abcdef',
  movie_id: 'm_example',
  start_time: '2026-11-10T19:00:00+08:00',
  hall: 'A',
  format: 'Digital'
};

test('preserves existing source provenance', () => {
  const old = { ...base, source: 'original', source_url: 'https://example.org/old' };
  const incoming = { ...base, source: 'new', source_url: 'https://example.org/new' };

  const result = mergeAdditive([old], [incoming]);
  assert.deepEqual(result, [old]);
});

test('adds a genuinely new screening', () => {
  const old = { ...base, source: 'original' };
  const incoming = {
    ...base,
    start_time: '2026-11-10T21:00:00+08:00',
    source: 'official'
  };

  const result = mergeAdditive([old], [incoming]);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], old);
  assert.deepEqual(result[1], incoming);
});

test('keeps all pre-existing historical records', () => {
  const a = { ...base, source: 'source-a' };
  const b = { ...base, source: 'source-b' };

  const result = mergeAdditive([a,b], []);
  assert.deepEqual(result, [a,b]);
});

test('is idempotent', () => {
  const old = { ...base };
  const incoming = {
    ...base,
    start_time: '2026-11-11T20:00:00+08:00'
  };

  const first = mergeAdditive([old], [incoming]);
  const second = mergeAdditive(first, [incoming]);

  assert.deepEqual(second, first);
});

test('keeps different formats', () => {
  const a = { ...base, format: 'Digital' };
  const b = { ...base, format: 'IMAX' };

  assert.equal(mergeAdditive([a], [b]).length, 2);
});

test('preserves verified audio and subtitles when refresh returns unknown', () => {
  const old = { ...base, audio_language: 'ja', subtitles: ['zh', 'en'], source: 'official' };
  const newer = { ...base, audio_language: null, subtitles: null, source: 'official' };
  const [row] = mergeAdditive([old], [newer]);
  assert.equal(row.audio_language, 'ja');
  assert.deepEqual(row.subtitles, ['zh', 'en']);
});

test('enriches missing language facts without replacing provenance', () => {
  const old = { ...base, source: 'old', source_url: 'https://example.org/old' };
  const newer = { ...base, source: 'new', source_url: 'https://example.org/new', audio_language: 'ko', subtitles: ['zh'] };
  const [row] = mergeAdditive([old], [newer]);
  assert.equal(row.audio_language, 'ko');
  assert.deepEqual(row.subtitles, ['zh']);
  assert.equal(row.source, 'old');
  assert.equal(row.source_url, 'https://example.org/old');
});

test('does not replace conflicting verified language metadata', () => {
  const old = { ...base, audio_language: 'en', subtitles: ['zh'] };
  const newer = { ...base, audio_language: 'ja', subtitles: ['en'] };
  assert.deepEqual(mergeAdditive([old], [newer])[0], old);
});

test('recognizes only explicitly labelled MUVIE audio languages', () => {
  assert.equal(mapAudio('數位(英)'), 'en');
  assert.equal(mapAudio('數位（英語）'), 'en');
  assert.equal(mapAudio('數位（國語）'), 'zh');
  assert.equal(mapAudio('數位（日語）'), 'ja');
  assert.equal(mapAudio('數位'), null);
  assert.equal(mapAudio('English film with Chinese subtitles'), null);
});
